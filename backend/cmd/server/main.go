package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"ochag-kz/internal/config"
	"ochag-kz/internal/handler"
	"ochag-kz/internal/middleware"
	"ochag-kz/internal/repository/postgres"
	"ochag-kz/internal/service"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
)

func main() {
	cfg := config.Load()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Database
	pool, err := postgres.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	// Repositories
	productRepo := postgres.NewProductRepo(pool)
	userRepo := postgres.NewUserRepo(pool)
	contactRepo := postgres.NewContactRepo(pool)
	inventoryRepo := postgres.NewInventoryRepo(pool)
	recommendationRepo := postgres.NewRecommendationRepo(pool)

	// Services
	productSvc := service.NewProductService(productRepo)
	authSvc := service.NewAuthService(userRepo, cfg.JWTSecret)
	contactSvc := service.NewContactService(contactRepo)
	inventorySvc := service.NewInventoryService(inventoryRepo)
	recommendationSvc := service.NewRecommendationService(recommendationRepo, productRepo)

	// Handlers
	productHandler := handler.NewProductHandler(productSvc, inventorySvc, recommendationSvc)
	authHandler := handler.NewAuthHandler(authSvc)
	contactHandler := handler.NewContactHandler(contactSvc)
	inventoryHandler := handler.NewInventoryHandler(inventorySvc, productSvc)

	// Rate limiters
	loginLimiter := middleware.NewRateLimiter(5, time.Minute)    // 5 attempts per minute per IP
	contactLimiter := middleware.NewRateLimiter(3, time.Minute)  // 3 submissions per minute per IP

	// Router
	r := chi.NewRouter()
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(securityHeaders)
	r.Use(corsMiddleware)

	// Public API
	r.Route("/api", func(r chi.Router) {
		r.Get("/products", productHandler.GetAll)
		r.Get("/products/{id}", productHandler.GetByID)
		r.With(contactLimiter.Middleware).Post("/contact", contactHandler.Create)
		r.With(loginLimiter.Middleware).Post("/auth/login", authHandler.Login)

		// Admin API (JWT required)
		r.Route("/admin", func(r chi.Router) {
			r.Use(middleware.JWTAuth(authSvc))

			// Products — manager and admin
			r.Route("/products", func(r chi.Router) {
				r.Use(middleware.RequireRole("admin", "manager"))
				r.Post("/", productHandler.Create)
				r.Put("/{id}", productHandler.Update)
				r.Delete("/{id}", productHandler.Delete)
				r.Post("/{id}/image", productHandler.UploadImage)
				r.Get("/{id}/recommendations", productHandler.GetRecommendations)
				r.Put("/{id}/recommendations", productHandler.SetRecommendations)
			})

			// Inventory — manager and admin
			r.Route("/inventory", func(r chi.Router) {
				r.Use(middleware.RequireRole("admin", "manager"))
				r.Get("/", inventoryHandler.GetAll)
				r.Put("/{productID}", inventoryHandler.AdjustStock)
				r.Get("/{productID}/logs", inventoryHandler.GetLogs)
			})

			// Users — admin only
			r.Route("/users", func(r chi.Router) {
				r.Use(middleware.RequireRole("admin"))
				r.Get("/", authHandler.GetUsers)
				r.Post("/", authHandler.CreateUser)
				r.Put("/{id}/role", authHandler.UpdateRole)
				r.Delete("/{id}", authHandler.DeleteUser)
			})
		})
	})

	// Static files — serve web/ directory
	webDir := filepath.Join(".", "web")
	fileServer := http.FileServer(http.Dir(webDir))

	r.Get("/*", func(w http.ResponseWriter, req *http.Request) {
		// Try to serve the file first
		path := filepath.Join(webDir, req.URL.Path)
		if _, err := os.Stat(path); err == nil {
			fileServer.ServeHTTP(w, req)
			return
		}

		// SPA routing
		if strings.HasPrefix(req.URL.Path, "/catalog") {
			http.ServeFile(w, req, filepath.Join(webDir, "catalog.html"))
			return
		}
		if req.URL.Path == "/admin" || req.URL.Path == "/admin/" {
			http.ServeFile(w, req, filepath.Join(webDir, "admin", "index.html"))
			return
		}
		if req.URL.Path == "/admin/users" {
			http.ServeFile(w, req, filepath.Join(webDir, "admin", "users.html"))
			return
		}
		if req.URL.Path == "/admin/products" {
			http.ServeFile(w, req, filepath.Join(webDir, "admin", "products.html"))
			return
		}
		if req.URL.Path == "/admin/stock" {
			http.ServeFile(w, req, filepath.Join(webDir, "admin", "stock.html"))
			return
		}
		http.ServeFile(w, req, filepath.Join(webDir, "index.html"))
	})

	// Server with graceful shutdown
	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: r,
	}

	go func() {
		log.Printf("Server starting on http://localhost:%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}
	log.Println("Server stopped")
}

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "SAMEORIGIN")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self'")
		next.ServeHTTP(w, r)
	})
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		// Allow same-origin and configured origins only
		allowed := origin == "" // same-origin requests have no Origin header
		allowedOrigins := []string{
			"http://localhost:8080",
			"https://ochagi-kaminy.kz",
			"https://www.ochagi-kaminy.kz",
		}
		for _, o := range allowedOrigins {
			if origin == o {
				allowed = true
				break
			}
		}

		if allowed && origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Max-Age", "3600")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
