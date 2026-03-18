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

	// Services
	productSvc := service.NewProductService(productRepo)
	authSvc := service.NewAuthService(userRepo, cfg.JWTSecret)
	contactSvc := service.NewContactService(contactRepo)
	inventorySvc := service.NewInventoryService(inventoryRepo)

	// Handlers
	productHandler := handler.NewProductHandler(productSvc, inventorySvc)
	authHandler := handler.NewAuthHandler(authSvc)
	contactHandler := handler.NewContactHandler(contactSvc)
	inventoryHandler := handler.NewInventoryHandler(inventorySvc, productSvc)

	// Router
	r := chi.NewRouter()
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(corsMiddleware)

	// Public API
	r.Route("/api", func(r chi.Router) {
		r.Get("/products", productHandler.GetAll)
		r.Get("/products/{id}", productHandler.GetByID)
		r.Post("/contact", contactHandler.Create)
		r.Post("/auth/login", authHandler.Login)

		// Admin API (JWT required)
		r.Route("/admin", func(r chi.Router) {
			r.Use(middleware.JWTAuth(authSvc))

			// Products — manager and admin
			r.Route("/products", func(r chi.Router) {
				r.Use(middleware.RequireRole("admin", "manager"))
				r.Post("/", productHandler.Create)
				r.Put("/{id}", productHandler.Update)
				r.Delete("/{id}", productHandler.Delete)
			})

			// Inventory — manager and admin
			r.Route("/inventory", func(r chi.Router) {
				r.Use(middleware.RequireRole("admin", "manager"))
				r.Get("/", inventoryHandler.GetAll)
				r.Put("/{productID}", inventoryHandler.AdjustStock)
				r.Get("/{productID}/logs", inventoryHandler.GetLogs)
			})

			// Users — admin only for create/delete/role, all authenticated for list
			r.Get("/users", authHandler.GetUsers)
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole("admin"))
				r.Post("/users", authHandler.CreateUser)
				r.Put("/users/{id}/role", authHandler.UpdateRole)
				r.Delete("/users/{id}", authHandler.DeleteUser)
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

		// SPA routing: /catalog* → catalog.html, everything else → index.html
		if strings.HasPrefix(req.URL.Path, "/catalog") {
			http.ServeFile(w, req, filepath.Join(webDir, "catalog.html"))
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

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
