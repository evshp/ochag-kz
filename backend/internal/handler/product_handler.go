package handler

import (
	"net/http"
	"strconv"

	"ochag-kz/internal/handler/dto"
	"ochag-kz/internal/service"

	"github.com/go-chi/chi/v5"
)

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
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "deleted"})
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
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if ids == nil {
		ids = []int64{}
	}

	writeJSON(w, http.StatusOK, dto.RecommendedIDsResponse{ProductIDs: ids})
}
