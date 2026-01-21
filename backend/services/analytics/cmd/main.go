package main

import (
	"github.com/kensan/backend/services/analytics/internal/handler"
	"github.com/kensan/backend/services/analytics/internal/repository"
	"github.com/kensan/backend/services/analytics/internal/service"
	"github.com/kensan/backend/shared/bootstrap"
	"github.com/rs/zerolog/log"
)

func main() {
	// Initialize service with common configuration
	svc, err := bootstrap.New("analytics-service")
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to initialize service")
	}
	defer svc.Close()

	// Setup repository, service, and handler
	analyticsRepo := repository.NewPostgresRepository(svc.Pool)
	analyticsService := service.NewService(analyticsRepo)
	analyticsHandler := handler.NewHandler(analyticsService)

	// Register routes
	svc.RegisterRoutes(analyticsHandler.RegisterRoutes)

	// Run server
	if err := svc.Run(); err != nil {
		log.Fatal().Err(err).Msg("Server error")
	}
}
