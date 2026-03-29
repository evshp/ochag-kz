package handler

import (
	"net/http"
	"strconv"

	"ochag-kz/internal/handler/dto"
	"ochag-kz/internal/middleware"
	"ochag-kz/internal/service"

	"github.com/go-chi/chi/v5"
)

type AuthHandler struct {
	svc *service.AuthService
}

func NewAuthHandler(svc *service.AuthService) *AuthHandler {
	return &AuthHandler{svc: svc}
}

// Login handles POST /api/auth/login
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req dto.LoginRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	token, err := h.svc.Login(r.Context(), req.Username, req.Password)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, dto.LoginResponse{Token: token})
}

// GetUsers handles GET /api/admin/users
func (h *AuthHandler) GetUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.svc.GetAllUsers(r.Context())
	if err != nil {
		writeInternalError(w, err)
		return
	}

	result := make([]dto.UserResponse, 0, len(users))
	for _, u := range users {
		result = append(result, dto.UserResponse{
			ID:        u.ID,
			Username:  u.Username,
			Role:      u.Role,
			CreatedAt: u.CreatedAt,
		})
	}

	writeJSON(w, http.StatusOK, result)
}

// CreateUser handles POST /api/admin/users
func (h *AuthHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	var req dto.CreateUserRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	id, err := h.svc.CreateUser(r.Context(), req.Username, req.Password, req.Role)
	if err != nil {
		status := http.StatusBadRequest
		if err == service.ErrUserExists {
			status = http.StatusConflict
		}
		writeError(w, status, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, map[string]int64{"id": id})
}

// UpdateRole handles PUT /api/admin/users/{id}/role
func (h *AuthHandler) UpdateRole(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	var req dto.UpdateRoleRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.svc.UpdateUserRole(r.Context(), id, req.Role); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "role updated"})
}

// DeleteUser handles DELETE /api/admin/users/{id}
func (h *AuthHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	currentUserID := middleware.UserIDFromCtx(r.Context())
	if err := h.svc.DeleteUser(r.Context(), id, currentUserID); err != nil {
		if err == service.ErrCannotDeleteSelf {
			writeError(w, http.StatusForbidden, err.Error())
			return
		}
		writeInternalError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "user deleted"})
}
