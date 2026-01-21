package main

import (
	"github.com/kensan/backend/services/task/internal/handler"
	"github.com/kensan/backend/services/task/internal/repository"
	"github.com/kensan/backend/services/task/internal/service"
	"github.com/kensan/backend/shared/bootstrap"
	"github.com/rs/zerolog/log"
)

func main() {
	// Initialize service with common configuration
	svc, err := bootstrap.New("task-service")
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to initialize service")
	}
	defer svc.Close()

	// Setup repository, service, and handler
	taskRepo := repository.NewPostgresRepository(svc.Pool)
	taskService := service.NewService(taskRepo)
	taskHandler := handler.NewHandler(taskService)

	// Register routes
	svc.RegisterRoutes(taskHandler.RegisterRoutes)

	// Run server
	if err := svc.Run(); err != nil {
		log.Fatal().Err(err).Msg("Server error")
	}
}
