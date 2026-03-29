package handler

import (
	"net/http"
	"strconv"
	"time"

	"ochag-kz/internal/handler/dto"
	"ochag-kz/internal/service"

	"github.com/go-chi/chi/v5"
)

type InventoryHandler struct {
	inventorySvc *service.InventoryService
	productSvc   *service.ProductService
}

func NewInventoryHandler(inventorySvc *service.InventoryService, productSvc *service.ProductService) *InventoryHandler {
	return &InventoryHandler{inventorySvc: inventorySvc, productSvc: productSvc}
}

// GetAll handles GET /api/admin/inventory
func (h *InventoryHandler) GetAll(w http.ResponseWriter, r *http.Request) {
	items, err := h.inventorySvc.GetAll(r.Context())
	if err != nil {
		writeInternalError(w, err)
		return
	}

	// Get product names for display
	products, err := h.productSvc.GetAll(r.Context(), "")
	if err != nil {
		writeInternalError(w, err)
		return
	}

	productMap := make(map[int64]struct{ Name, Category string })
	for _, p := range products {
		productMap[p.ID] = struct{ Name, Category string }{p.Name, p.Category}
	}

	result := make([]dto.InventoryResponse, 0, len(items))
	for _, item := range items {
		info := productMap[item.ProductID]
		result = append(result, dto.InventoryResponse{
			ProductID:   item.ProductID,
			ProductName: info.Name,
			Category:    info.Category,
			Quantity:    item.Quantity,
			UpdatedAt:   item.UpdatedAt.Format(time.RFC3339),
		})
	}

	writeJSON(w, http.StatusOK, result)
}

// AdjustStock handles PUT /api/admin/inventory/{productID}
func (h *InventoryHandler) AdjustStock(w http.ResponseWriter, r *http.Request) {
	productID, err := strconv.ParseInt(chi.URLParam(r, "productID"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid product id")
		return
	}

	var req dto.AdjustStockRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.inventorySvc.AdjustStock(r.Context(), productID, req.Delta, req.Reason); err != nil {
		status := http.StatusBadRequest
		if err == service.ErrInventoryNotFound {
			status = http.StatusNotFound
		}
		writeError(w, status, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "stock updated"})
}

// GetLogs handles GET /api/admin/inventory/{productID}/logs
func (h *InventoryHandler) GetLogs(w http.ResponseWriter, r *http.Request) {
	productID, err := strconv.ParseInt(chi.URLParam(r, "productID"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid product id")
		return
	}

	logs, err := h.inventorySvc.GetLogs(r.Context(), productID)
	if err != nil {
		writeInternalError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dto.InventoryLogsFromModel(logs))
}
