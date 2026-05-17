package main

import (
	"context"
	"fmt"
	"os"

	"go-idp/internal/auth"
	"go-idp/internal/config"
	"go-idp/internal/database"
	otelinit "go-idp/internal/otel"
	"go-idp/internal/server"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		fatal("config", err)
	}

	ctx := context.Background()

	otelShutdown, err := otelinit.Init(ctx, cfg.OTELEndpoint, cfg.OTELHeaders)
	if err != nil {
		fatal("otel init", err)
	}

	db, err := database.Open(cfg.DatabaseURL)
	if err != nil {
		fatal("database open", err)
	}

	signer := auth.NewJWTSigner(cfg.JWTSecret)
	srv := server.New(db, signer, cfg.Port, otelShutdown)
	if err := srv.Run(); err != nil {
		fatal("server", err)
	}
}

func fatal(where string, err error) {
	fmt.Fprintf(os.Stderr, `{"level":"fatal","msg":%q,"err":%q}`+"\n", where, err.Error())
	os.Exit(1)
}
