package main

import (
	"log/slog"
	"os"

	"github.com/kensan/backend/services/routine/internal/handler"
	"github.com/kensan/backend/services/routine/internal/repository"
	"github.com/kensan/backend/services/routine/internal/service"
	"github.com/kensan/backend/shared/bootstrap"
)

func main() {
	// Initialize service with common configuration
	svc, err := bootstrap.New("routine-service")
	if err != nil {
		slog.Error("Failed to initialize service", "error", err)
		os.Exit(1)
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
		slog.Error("Server error", "error", err)
		os.Exit(1)
	}
}
