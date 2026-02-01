package main

import (
	"context"
	"os"

	"github.com/kensan/backend/services/note/internal/handler"
	"github.com/kensan/backend/services/note/internal/repository"
	"github.com/kensan/backend/services/note/internal/service"
	"github.com/kensan/backend/services/note/internal/storage"
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

	// Setup storage client (optional - service works without it)
	var storageClient *storage.Client
	if endpoint := os.Getenv("STORAGE_ENDPOINT"); endpoint != "" {
		storageCfg := storage.Config{
			Endpoint:  endpoint,
			AccessKey: os.Getenv("STORAGE_ACCESS_KEY"),
			SecretKey: os.Getenv("STORAGE_SECRET_KEY"),
			Bucket:    os.Getenv("STORAGE_BUCKET"),
			UseSSL:    os.Getenv("STORAGE_USE_SSL") == "true",
			PublicURL: os.Getenv("STORAGE_PUBLIC_URL"),
		}
		if storageCfg.Bucket == "" {
			storageCfg.Bucket = "kensan-notes"
		}

		storageClient, err = storage.NewClient(storageCfg)
		if err != nil {
			log.Warn().Err(err).Msg("Failed to initialize storage client, file upload will be disabled")
		} else {
			log.Info().Str("endpoint", endpoint).Str("bucket", storageCfg.Bucket).Msg("Storage client initialized")
		}
	} else {
		log.Info().Msg("Storage not configured, file upload will be disabled")
	}

	// Setup repository, service, and handler
	noteRepo := repository.NewPostgresRepository(svc.Pool)
	noteService := service.NewService(noteRepo, storageClient)

	// Load note type configurations from database
	if err := noteService.LoadNoteTypes(context.Background()); err != nil {
		log.Fatal().Err(err).Msg("Failed to load note types")
	}
	log.Info().Msg("Note types loaded successfully")

	noteHandler := handler.NewHandler(noteService)

	// Register routes
	svc.RegisterRoutes(noteHandler.RegisterRoutes)

	// Run server
	if err := svc.Run(); err != nil {
		log.Fatal().Err(err).Msg("Server error")
	}
}
