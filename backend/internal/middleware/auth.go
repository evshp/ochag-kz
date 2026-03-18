package middleware

import (
	"context"
	"net/http"
	"strings"

	"ochag-kz/internal/service"
)

type contextKey string

const (
	ctxUserID   contextKey = "user_id"
	ctxUsername contextKey = "username"
	ctxRole    contextKey = "role"
)

func JWTAuth(authSvc *service.AuthService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, `{"error":"authorization header required"}`, http.StatusUnauthorized)
				return
			}

			token := strings.TrimPrefix(authHeader, "Bearer ")
			if token == authHeader {
				http.Error(w, `{"error":"invalid authorization format"}`, http.StatusUnauthorized)
				return
			}

			userID, username, role, err := authSvc.ValidateToken(token)
			if err != nil {
				http.Error(w, `{"error":"invalid or expired token"}`, http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), ctxUserID, userID)
			ctx = context.WithValue(ctx, ctxUsername, username)
			ctx = context.WithValue(ctx, ctxRole, role)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequireRole(roles ...string) func(http.Handler) http.Handler {
	roleSet := make(map[string]bool, len(roles))
	for _, r := range roles {
		roleSet[r] = true
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			role := RoleFromCtx(r.Context())
			if !roleSet[role] {
				http.Error(w, `{"error":"insufficient permissions"}`, http.StatusForbidden)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func UserIDFromCtx(ctx context.Context) int64 {
	if v, ok := ctx.Value(ctxUserID).(int64); ok {
		return v
	}
	return 0
}

func RoleFromCtx(ctx context.Context) string {
	if v, ok := ctx.Value(ctxRole).(string); ok {
		return v
	}
	return ""
}
