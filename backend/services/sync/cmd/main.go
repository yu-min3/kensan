package main

import (
	"github.com/kensan/backend/services/sync/internal/clockify"
	"github.com/kensan/backend/services/sync/internal/handler"
	"github.com/kensan/backend/services/sync/internal/repository"
	"github.com/kensan/backend/services/sync/internal/service"
	"github.com/kensan/backend/shared/bootstrap"
	"github.com/rs/zerolog/log"
)

func main() {
	// Initialize service with common configuration
	svc, err := bootstrap.New("sync-service")
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to initialize service")
	}
	defer svc.Close()

	// Setup Clockify client, repository, service, and handler
	clockifyClient := clockify.NewClient(svc.Config.Clockify.BaseURL)
	syncRepo := repository.NewPostgresRepository(svc.Pool)
	syncService := service.NewService(syncRepo, clockifyClient)
	syncHandler := handler.NewHandler(syncService)

	// Register routes
	svc.RegisterRoutes(syncHandler.RegisterRoutes)

	// Run server
	if err := svc.Run(); err != nil {
		log.Fatal().Err(err).Msg("Server error")
	}
}
