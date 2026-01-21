// Package logging provides common logging setup for all services.
package logging

import (
	"os"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

// Setup configures the global zerolog logger based on the environment.
// In non-production environments, it outputs human-readable logs to stderr.
// In production, it outputs JSON logs with Unix timestamps.
func Setup(env string) {
	if env == "production" {
		// Production: JSON format with Unix timestamps
		zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	} else {
		// Development: Human-readable format with RFC3339 timestamps
		zerolog.TimeFieldFormat = time.RFC3339
		log.Logger = log.Output(zerolog.ConsoleWriter{
			Out:        os.Stderr,
			TimeFormat: time.RFC3339,
		})
	}
}

// SetupFromEnv configures logging based on the SERVER_ENV environment variable.
// Defaults to development mode if SERVER_ENV is not set or is not "production".
func SetupFromEnv() {
	Setup(os.Getenv("SERVER_ENV"))
}

// With returns a new logger with the given fields.
func With(fields map[string]any) zerolog.Logger {
	ctx := log.With()
	for k, v := range fields {
		ctx = ctx.Interface(k, v)
	}
	return ctx.Logger()
}

// ServiceLogger returns a logger with the service name attached.
func ServiceLogger(serviceName string) zerolog.Logger {
	return log.With().Str("service", serviceName).Logger()
}
