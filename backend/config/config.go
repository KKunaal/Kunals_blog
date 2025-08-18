package config

import (
	"os"
)

type Config struct {
	Port          string
	DatabaseURL   string
	JWTSecret     string
	AdminUsername string
	AdminPassword string
	UploadPath    string
}

func GetConfig() *Config {
	return &Config{
		Port:          getEnv("PORT", "8080"),
		DatabaseURL:   getEnv("DATABASE_URL", ""),
		JWTSecret:     getEnv("JWT_SECRET", "your-super-secret-jwt-key-change-this-in-production"),
		AdminUsername: getEnv("ADMIN_USERNAME", "admin"),
		AdminPassword: getEnv("ADMIN_PASSWORD", "admin123"),
		UploadPath:    getEnv("UPLOAD_PATH", "./uploads"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
