package handler

import (
	"net/http"

	"ochag-kz/internal/handler/dto"
	"ochag-kz/internal/service"
)

type ContactHandler struct {
	svc *service.ContactService
}

func NewContactHandler(svc *service.ContactService) *ContactHandler {
	return &ContactHandler{svc: svc}
}

// Create handles POST /api/contact
func (h *ContactHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req dto.ContactFormRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	_, err := h.svc.Create(r.Context(), req.Name, req.Phone, req.Message)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, dto.ContactFormResponse{
		OK:      true,
		Message: "Заявка отправлена",
	})
}
