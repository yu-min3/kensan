package main

import (
	"os"
	"time"

	"github.com/kensan/backend/services/ai/internal/claude"
	"github.com/kensan/backend/services/ai/internal/handler"
	"github.com/kensan/backend/services/ai/internal/repository"
	"github.com/kensan/backend/services/ai/internal/service"
	"github.com/kensan/backend/shared/bootstrap"
	"github.com/rs/zerolog/log"
)

func main() {
	// Get Claude API key from environment
	claudeAPIKey := os.Getenv("CLAUDE_API_KEY")
	if claudeAPIKey == "" {
		log.Fatal().Msg("CLAUDE_API_KEY environment variable is required")
	}

	// Initialize service with common configuration
	// AI service needs longer write timeout for Claude API calls
	svc, err := bootstrap.New("ai-service", bootstrap.WithWriteTimeout(120*time.Second))
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to initialize service")
	}
	defer svc.Close()

	// Setup Claude client, repository, service, and handler
	claudeClient := claude.NewClient(claudeAPIKey)
	aiRepo := repository.NewPostgresRepository(svc.Pool)
	aiService := service.NewService(aiRepo, claudeClient)
	aiHandler := handler.NewHandler(aiService)

	// Register routes
	svc.RegisterRoutes(aiHandler.RegisterRoutes)

	// Run server
	if err := svc.Run(); err != nil {
		log.Fatal().Err(err).Msg("Server error")
	}
}
