package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL  string
	JWTSecret    string
	OTELEndpoint string
	OTELHeaders  string
	Port         int
}

func Load() (*Config, error) {
	_ = godotenv.Load()
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return nil, errors.New("DATABASE_URL is required")
	}
	secret := os.Getenv("JWT_SECRET")
	if len(secret) < 16 {
		return nil, errors.New("JWT_SECRET must be at least 16 characters")
	}
	port := 8080
	if raw := os.Getenv("PORT"); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n <= 0 {
			return nil, fmt.Errorf("invalid PORT: %q", raw)
		}
		port = n
	}
	return &Config{
		DatabaseURL:  dbURL,
		JWTSecret:    secret,
		OTELEndpoint: os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT"),
		OTELHeaders:  os.Getenv("OTEL_EXPORTER_OTLP_HEADERS"),
		Port:         port,
	}, nil
}
