package config

import (
	"log"
	"os"
)

type Config struct {
	Port        string
	DatabaseURL string
	JWTSecret   string
}

func Load() *Config {
	jwtSecret := getEnv("JWT_SECRET", "")
	if jwtSecret == "" || jwtSecret == "ochag-secret-change-me" || jwtSecret == "your-secret-key-change-me" {
		log.Println("WARNING: JWT_SECRET is not set or uses a default value. Set a strong secret via JWT_SECRET env var.")
		if jwtSecret == "" {
			jwtSecret = "dev-only-insecure-secret"
		}
	}

	return &Config{
		Port:        getEnv("PORT", "8080"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/ochag?sslmode=disable"),
		JWTSecret:   jwtSecret,
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
