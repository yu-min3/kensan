// Package bootstrap provides common service initialization utilities.
package bootstrap

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kensan/backend/shared/auth"
	"github.com/kensan/backend/shared/config"
	"github.com/kensan/backend/shared/database"
	"github.com/kensan/backend/shared/logging"
	"github.com/kensan/backend/shared/middleware"
	"github.com/kensan/backend/shared/telemetry"
	"github.com/rs/zerolog/log"
)

// Service represents a microservice with its configuration and dependencies.
type Service struct {
	Name         string
	Config       *config.Config
	Pool         *pgxpool.Pool
	JWTManager   *auth.JWTManager
	Router       chi.Router
	apiRouter    chi.Router // sub-router for /api/v1 routes
	writeTimeout time.Duration
	otelProvider *telemetry.Provider
}

// RouteRegistrar is a function that registers routes on a chi.Router.
// It receives the router with authentication middleware already applied.
type RouteRegistrar func(r chi.Router)

// Option is a function that configures a Service.
type Option func(*Service)

// WithWriteTimeout sets a custom write timeout for the HTTP server.
// Useful for services that handle long-running requests (e.g., AI service).
func WithWriteTimeout(d time.Duration) Option {
	return func(s *Service) {
		s.writeTimeout = d
	}
}

// New creates a new Service with all common dependencies initialized.
// It sets up logging, database connection, JWT manager, and router with middleware.
func New(name string, opts ...Option) (*Service, error) {
	// Setup logging
	logging.SetupFromEnv()
	logger := logging.ServiceLogger(name)

	// Load configuration
	cfg := config.Load()

	// Setup OpenTelemetry
	ctx := context.Background()
	otelProvider, err := telemetry.Initialize(ctx, telemetry.Config{
		ServiceName:  name,
		Environment:  cfg.Server.Env,
		CollectorURL: cfg.Telemetry.CollectorURL,
		Enabled:      cfg.Telemetry.Enabled,
	})
	if err != nil {
		logger.Warn().Err(err).Msg("Failed to initialize OpenTelemetry, continuing without it")
		otelProvider = &telemetry.Provider{}
	}
	if cfg.Telemetry.Enabled {
		logger.Info().Str("collector", cfg.Telemetry.CollectorURL).Msg("OpenTelemetry initialized")
	}

	// Setup database connection
	pool, err := database.NewPostgresPool(ctx, cfg.Database)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	logger.Info().Msg("Connected to database")

	// Setup JWT manager
	jwtManager := auth.NewJWTManager(cfg.JWT)

	// Setup router with common middleware
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.OTelTrace(name))
	r.Use(middleware.Metrics)
	r.Use(middleware.Logger)
	r.Use(corsMiddleware())

	// Health check endpoint (no auth required)
	r.Get("/health", healthHandler(name))

	// Create API router for /api/v1 prefix
	apiRouter := chi.NewRouter()
	r.Mount("/api/v1", apiRouter)

	svc := &Service{
		Name:         name,
		Config:       cfg,
		Pool:         pool,
		JWTManager:   jwtManager,
		Router:       r,
		apiRouter:    apiRouter,
		writeTimeout: 15 * time.Second, // default
		otelProvider: otelProvider,
	}

	// Apply options
	for _, opt := range opts {
		opt(svc)
	}

	return svc, nil
}

// RegisterRoutes registers API routes with authentication middleware.
// Routes are registered under /api/v1 prefix.
func (s *Service) RegisterRoutes(registrar RouteRegistrar) {
	s.apiRouter.Group(func(r chi.Router) {
		r.Use(middleware.Auth(s.JWTManager))
		registrar(r)
	})
}

// RegisterPublicRoutes registers API routes without authentication.
// Routes are registered under /api/v1 prefix.
func (s *Service) RegisterPublicRoutes(registrar RouteRegistrar) {
	s.apiRouter.Group(func(r chi.Router) {
		registrar(r)
	})
}

// Run starts the HTTP server and blocks until shutdown signal is received.
func (s *Service) Run() error {
	addr := fmt.Sprintf("%s:%d", s.Config.Server.Host, s.Config.Server.Port)
	server := &http.Server{
		Addr:         addr,
		Handler:      s.Router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: s.writeTimeout,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	errCh := make(chan error, 1)
	go func() {
		log.Info().Str("addr", addr).Str("service", s.Name).Msg("Starting service")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errCh <- err
		}
	}()

	// Wait for interrupt signal or server error
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-errCh:
		return fmt.Errorf("server error: %w", err)
	case <-quit:
		log.Info().Str("service", s.Name).Msg("Shutting down server...")
	}

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		return fmt.Errorf("server forced to shutdown: %w", err)
	}

	log.Info().Str("service", s.Name).Msg("Server exited properly")
	return nil
}

// Close releases all resources held by the service.
func (s *Service) Close() {
	if s.otelProvider != nil {
		if err := s.otelProvider.Shutdown(context.Background()); err != nil {
			log.Warn().Err(err).Msg("Failed to shutdown OpenTelemetry")
		}
	}
	if s.Pool != nil {
		s.Pool.Close()
	}
}

// corsMiddleware returns the CORS middleware with common configuration.
func corsMiddleware() func(http.Handler) http.Handler {
	return cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:*", "https://*.kensan.dev"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Request-ID", "traceparent", "tracestate"},
		ExposedHeaders:   []string{"X-Request-ID", "traceparent", "tracestate"},
		AllowCredentials: true,
		MaxAge:           300,
	})
}

// healthHandler returns a handler for health check endpoint.
func healthHandler(serviceName string) http.HandlerFunc {
	response := fmt.Sprintf(`{"status":"healthy","service":"%s"}`, serviceName)
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(response))
	}
}
