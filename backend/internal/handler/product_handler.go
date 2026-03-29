package handler

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"ochag-kz/internal/handler/dto"
	"ochag-kz/internal/service"

	"github.com/go-chi/chi/v5"
)

// allowedImageExts is a whitelist of allowed file extensions for product images.
var allowedImageExts = map[string]bool{
	".jpg": true, ".jpeg": true, ".png": true, ".webp": true,
}

// allowedImageMIME is a whitelist of allowed MIME types detected by http.DetectContentType.
var allowedImageMIME = map[string]bool{
	"image/jpeg": true, "image/png": true, "image/webp": true,
}

type ProductHandler struct {
	svc          *service.ProductService
	inventorySvc *service.InventoryService
	recSvc       *service.RecommendationService
}

func NewProductHandler(svc *service.ProductService, inventorySvc *service.InventoryService, recSvc *service.RecommendationService) *ProductHandler {
	return &ProductHandler{svc: svc, inventorySvc: inventorySvc, recSvc: recSvc}
}

// GetAll handles GET /api/products?category=bowl
func (h *ProductHandler) GetAll(w http.ResponseWriter, r *http.Request) {
	category := r.URL.Query().Get("category")

	products, err := h.svc.GetAll(r.Context(), category)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	responses := dto.ProductsFromModel(products)

	// Attach recommendations (up to 3 per product in list view)
	if h.recSvc != nil {
		recsMap, err := h.recSvc.GetRecommendationsMap(r.Context(), products, 3)
		if err == nil {
			dto.AttachRecommendations(responses, recsMap)
		}
	}

	writeJSON(w, http.StatusOK, responses)
}

// GetByID handles GET /api/products/{id}
func (h *ProductHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid product id")
		return
	}

	product, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	resp := dto.ProductFromModel(product)

	// Attach full recommendations for detail view
	if h.recSvc != nil {
		recs, err := h.recSvc.GetRecommendations(r.Context(), id)
		if err == nil && len(recs) > 0 {
			resp.Recommendations = dto.RecommendationBriefsFromModel(recs)
		}
	}

	writeJSON(w, http.StatusOK, resp)
}

// Create handles POST /api/admin/products
func (h *ProductHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req dto.CreateProductRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := req.Validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	product := req.ToModel()
	id, err := h.svc.Create(r.Context(), product)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	product.ID = id

	// Create inventory record for new product
	if h.inventorySvc != nil {
		_ = h.inventorySvc.EnsureExists(r.Context(), id)
	}

	writeJSON(w, http.StatusCreated, dto.ProductFromModel(product))
}

// Update handles PUT /api/admin/products/{id}
func (h *ProductHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid product id")
		return
	}

	var req dto.UpdateProductRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := req.Validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	product := req.ToModel(id)
	if err := h.svc.Update(r.Context(), product); err != nil {
		if err == service.ErrProductNotFound {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, dto.ProductFromModel(product))
}

// Delete handles DELETE /api/admin/products/{id}
func (h *ProductHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid product id")
		return
	}

	if err := h.svc.Delete(r.Context(), id); err != nil {
		if err == service.ErrProductNotFound {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeInternalError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "deleted"})
}

// UploadImage handles POST /api/admin/products/{id}/image
// Accepts multipart/form-data with a "file" field, saves it to web/assets/products/
func (h *ProductHandler) UploadImage(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid product id")
		return
	}

	// Verify product exists
	if _, err := h.svc.GetByID(r.Context(), id); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	if err := r.ParseMultipartForm(10 << 20); err != nil { // 10 MB max
		writeError(w, http.StatusBadRequest, "file too large or invalid form")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "missing file field")
		return
	}
	defer file.Close()

	// Validate file extension
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if !allowedImageExts[ext] {
		writeError(w, http.StatusBadRequest, "unsupported file type: only jpg, png, webp allowed")
		return
	}

	// Validate content by reading first 512 bytes for MIME detection
	buf := make([]byte, 512)
	n, err := file.Read(buf)
	if err != nil {
		writeError(w, http.StatusBadRequest, "cannot read file")
		return
	}
	detectedMIME := http.DetectContentType(buf[:n])
	if !allowedImageMIME[detectedMIME] {
		writeError(w, http.StatusBadRequest, "file content is not a valid image")
		return
	}
	// Reset file reader to beginning
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		writeError(w, http.StatusInternalServerError, "cannot process file")
		return
	}

	filename := fmt.Sprintf("product-%d%s", id, ext)

	dir := filepath.Join(".", "web", "assets", "products")
	if err := os.MkdirAll(dir, 0755); err != nil {
		writeError(w, http.StatusInternalServerError, "cannot create directory")
		return
	}

	dst, err := os.Create(filepath.Join(dir, filename))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot save file")
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		writeError(w, http.StatusInternalServerError, "cannot write file")
		return
	}

	imageURL := "/assets/products/" + filename
	if err := h.svc.UpdateImageURL(r.Context(), id, imageURL); err != nil {
		writeInternalError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"image_url": imageURL})
}

// SetRecommendations handles PUT /api/admin/products/{id}/recommendations
func (h *ProductHandler) SetRecommendations(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid product id")
		return
	}

	var req dto.SetRecommendationsRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.recSvc.SetRecommendations(r.Context(), id, req.ProductIDs); err != nil {
		if err == service.ErrProductNotFound {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "recommendations updated"})
}

// GetRecommendations handles GET /api/admin/products/{id}/recommendations
func (h *ProductHandler) GetRecommendations(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid product id")
		return
	}

	ids, err := h.recSvc.GetRecommendedIDs(r.Context(), id)
	if err != nil {
		writeInternalError(w, err)
		return
	}

	if ids == nil {
		ids = []int64{}
	}

	writeJSON(w, http.StatusOK, dto.RecommendedIDsResponse{ProductIDs: ids})
}
