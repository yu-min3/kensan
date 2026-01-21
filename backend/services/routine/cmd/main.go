package main

import (
	"github.com/kensan/backend/services/routine/internal/handler"
	"github.com/kensan/backend/services/routine/internal/repository"
	"github.com/kensan/backend/services/routine/internal/service"
	"github.com/kensan/backend/shared/bootstrap"
	"github.com/rs/zerolog/log"
)

func main() {
	// Initialize service with common configuration
	svc, err := bootstrap.New("routine-service")
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to initialize service")
	}
	defer svc.Close()

	// Setup repository, service, and handler
	routineRepo := repository.NewPostgresRepository(svc.Pool)
	routineService := service.NewService(routineRepo)
	routineHandler := handler.NewHandler(routineService)

	// Register routes
	svc.RegisterRoutes(routineHandler.RegisterRoutes)

	// Run server
	if err := svc.Run(); err != nil {
		log.Fatal().Err(err).Msg("Server error")
	}
}
