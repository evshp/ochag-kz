package handler

import (
	"net/http"
	"strconv"

	"ochag-kz/internal/handler/dto"
	"ochag-kz/internal/service"

	"github.com/go-chi/chi/v5"
)

type ProductHandler struct {
	svc *service.ProductService
}

func NewProductHandler(svc *service.ProductService) *ProductHandler {
	return &ProductHandler{svc: svc}
}

// GetAll handles GET /api/products?category=bowl
func (h *ProductHandler) GetAll(w http.ResponseWriter, r *http.Request) {
	category := r.URL.Query().Get("category")

	products, err := h.svc.GetAll(r.Context(), category)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, dto.ProductsFromModel(products))
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

	writeJSON(w, http.StatusOK, dto.ProductFromModel(product))
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
