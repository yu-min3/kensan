package main

import (
	"github.com/kensan/backend/services/note/internal/handler"
	"github.com/kensan/backend/services/note/internal/repository"
	"github.com/kensan/backend/services/note/internal/service"
	"github.com/kensan/backend/shared/bootstrap"
	"github.com/rs/zerolog/log"
)

func main() {
	// Initialize service with common configuration
	svc, err := bootstrap.New("note-service")
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to initialize service")
	}
	defer svc.Close()

	// Setup repository, service, and handler
	noteRepo := repository.NewPostgresRepository(svc.Pool)
	noteService := service.NewService(noteRepo)
	noteHandler := handler.NewHandler(noteService)

	// Register routes
	svc.RegisterRoutes(noteHandler.RegisterRoutes)

	// Run server
	if err := svc.Run(); err != nil {
		log.Fatal().Err(err).Msg("Server error")
	}
}
