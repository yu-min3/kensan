package main

import (
	"github.com/kensan/backend/services/timeblock/internal/handler"
	"github.com/kensan/backend/services/timeblock/internal/repository"
	"github.com/kensan/backend/services/timeblock/internal/service"
	"github.com/kensan/backend/shared/bootstrap"
	"github.com/rs/zerolog/log"
)

func main() {
	// Initialize service with common configuration
	svc, err := bootstrap.New("timeblock-service")
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to initialize service")
	}
	defer svc.Close()

	// Setup repository, service, and handler
	timeblockRepo := repository.NewPostgresRepository(svc.Pool)
	timeblockService := service.NewService(timeblockRepo)
	timeblockHandler := handler.NewHandler(timeblockService)

	// Register routes
	svc.RegisterRoutes(timeblockHandler.RegisterRoutes)

	// Run server
	if err := svc.Run(); err != nil {
		log.Fatal().Err(err).Msg("Server error")
	}
}
