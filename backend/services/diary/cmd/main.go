package main

import (
	"github.com/kensan/backend/services/diary/internal/handler"
	"github.com/kensan/backend/services/diary/internal/repository"
	"github.com/kensan/backend/services/diary/internal/service"
	"github.com/kensan/backend/shared/bootstrap"
	"github.com/rs/zerolog/log"
)

func main() {
	// Initialize service with common configuration
	svc, err := bootstrap.New("diary-service")
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to initialize service")
	}
	defer svc.Close()

	// Setup repository, service, and handler
	diaryRepo := repository.NewPostgresRepository(svc.Pool)
	diaryService := service.NewService(diaryRepo)
	diaryHandler := handler.NewHandler(diaryService)

	// Register routes
	svc.RegisterRoutes(diaryHandler.RegisterRoutes)

	// Run server
	if err := svc.Run(); err != nil {
		log.Fatal().Err(err).Msg("Server error")
	}
}
