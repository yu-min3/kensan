package main

import (
	"github.com/kensan/backend/services/memo/internal/handler"
	"github.com/kensan/backend/services/memo/internal/repository"
	"github.com/kensan/backend/services/memo/internal/service"
	"github.com/kensan/backend/shared/bootstrap"
	"github.com/rs/zerolog/log"
)

func main() {
	// Initialize service with common configuration
	svc, err := bootstrap.New("memo-service")
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to initialize service")
	}
	defer svc.Close()

	// Setup repository, service, and handler
	memoRepo := repository.NewPostgresRepository(svc.Pool)
	memoService := service.NewService(memoRepo)
	memoHandler := handler.NewHandler(memoService)

	// Register routes
	svc.RegisterRoutes(memoHandler.RegisterRoutes)

	// Run server
	if err := svc.Run(); err != nil {
		log.Fatal().Err(err).Msg("Server error")
	}
}
