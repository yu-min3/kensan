package main

import (
	"github.com/kensan/backend/services/user/internal/handler"
	"github.com/kensan/backend/services/user/internal/repository"
	"github.com/kensan/backend/services/user/internal/service"
	"github.com/kensan/backend/shared/bootstrap"
	"github.com/rs/zerolog/log"
)

func main() {
	// Initialize service with common configuration
	svc, err := bootstrap.New("user-service")
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to initialize service")
	}
	defer svc.Close()

	// Setup repository, service, and handler
	// Note: user service needs JWTManager for token generation
	userRepo := repository.NewPostgresRepository(svc.Pool)
	userService := service.NewService(userRepo, svc.JWTManager)
	userHandler := handler.NewHandler(userService)

	// Register public routes (no auth required)
	svc.RegisterPublicRoutes(userHandler.RegisterPublicRoutes)

	// Register protected routes (auth required)
	svc.RegisterRoutes(userHandler.RegisterRoutes)

	// Run server
	if err := svc.Run(); err != nil {
		log.Fatal().Err(err).Msg("Server error")
	}
}
