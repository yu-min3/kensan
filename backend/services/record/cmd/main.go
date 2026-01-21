package main

import (
	"github.com/kensan/backend/services/record/internal/handler"
	"github.com/kensan/backend/services/record/internal/repository"
	"github.com/kensan/backend/services/record/internal/service"
	"github.com/kensan/backend/shared/bootstrap"
	"github.com/rs/zerolog/log"
)

func main() {
	// Initialize service with common configuration
	svc, err := bootstrap.New("record-service")
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to initialize service")
	}
	defer svc.Close()

	// Setup repository, service, and handler
	recordRepo := repository.NewPostgresRepository(svc.Pool)
	recordService := service.NewService(recordRepo)
	recordHandler := handler.NewHandler(recordService)

	// Register routes
	svc.RegisterRoutes(recordHandler.RegisterRoutes)

	// Run server
	if err := svc.Run(); err != nil {
		log.Fatal().Err(err).Msg("Server error")
	}
}
