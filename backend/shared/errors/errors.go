// Package errors provides common error types and utilities for all services.
package errors

import (
	"errors"
	"fmt"
)

// Common base errors that can be used with errors.Is()
var (
	// ErrNotFound is the base error for "not found" scenarios
	ErrNotFound = errors.New("not found")

	// ErrInvalidInput is the base error for invalid input scenarios
	ErrInvalidInput = errors.New("invalid input")

	// ErrUnauthorized is the base error for unauthorized access
	ErrUnauthorized = errors.New("unauthorized")

	// ErrAlreadyExists is the base error for duplicate entries
	ErrAlreadyExists = errors.New("already exists")

	// ErrRequired is the base error for missing required fields
	ErrRequired = errors.New("required")

	// ErrInvalidFormat is the base error for format validation failures
	ErrInvalidFormat = errors.New("invalid format")
)

// EntityError wraps a base error with an entity name for context
type EntityError struct {
	Entity string
	Base   error
}

func (e *EntityError) Error() string {
	return fmt.Sprintf("%s %s", e.Entity, e.Base.Error())
}

func (e *EntityError) Unwrap() error {
	return e.Base
}

// NotFound creates a "not found" error for a specific entity
func NotFound(entity string) error {
	return &EntityError{Entity: entity, Base: ErrNotFound}
}

// AlreadyExists creates an "already exists" error for a specific entity
func AlreadyExists(entity string) error {
	return &EntityError{Entity: entity, Base: ErrAlreadyExists}
}

// FieldError wraps a base error with a field name for validation context
type FieldError struct {
	Field string
	Base  error
}

func (e *FieldError) Error() string {
	return fmt.Sprintf("%s %s", e.Field, e.Base.Error())
}

func (e *FieldError) Unwrap() error {
	return e.Base
}

// Required creates a "required" error for a specific field
func Required(field string) error {
	return &FieldError{Field: field, Base: ErrRequired}
}

// InvalidFormat creates an "invalid format" error with a custom message
func InvalidFormat(field, expected string) error {
	return fmt.Errorf("%s: %w (expected %s)", field, ErrInvalidFormat, expected)
}

// Validation errors for common fields
var (
	ErrInvalidDate      = InvalidFormat("date", "YYYY-MM-DD")
	ErrInvalidTime      = InvalidFormat("time", "HH:mm")
	ErrInvalidEmail     = InvalidFormat("email", "valid email address")
	ErrInvalidTheme     = fmt.Errorf("theme: %w (must be light, dark, or system)", ErrInvalidInput)
	ErrPasswordTooShort = fmt.Errorf("password: %w (must be at least 8 characters)", ErrInvalidInput)
)

// Service-specific "not found" errors for backward compatibility
// These can be used directly or services can create their own using NotFound()
var (
	ErrUserNotFound       = NotFound("user")
	ErrGoalNotFound       = NotFound("goal")
	ErrMilestoneNotFound  = NotFound("milestone")
	ErrTagNotFound        = NotFound("tag")
	ErrTaskNotFound       = NotFound("task")
	ErrDiaryNotFound      = NotFound("diary entry")
	ErrRecordNotFound     = NotFound("record")
	ErrRoutineNotFound    = NotFound("routine task")
	ErrTimeBlockNotFound  = NotFound("time block")
	ErrTimeEntryNotFound  = NotFound("time entry")
	ErrTimerNotFound      = NotFound("timer")
	ErrReportNotFound     = NotFound("report")
	ErrMemoNotFound       = NotFound("memo")
	ErrSettingsNotFound   = NotFound("settings")
	ErrAPIKeyNotFound     = NotFound("API key")
	ErrSyncStatusNotFound = NotFound("sync status")
)

// Service-specific errors
var (
	ErrInvalidCredentials  = fmt.Errorf("credentials: %w", ErrUnauthorized)
	ErrUserExists          = AlreadyExists("user")
	ErrTimerAlreadyRunning = fmt.Errorf("timer: %w (already running)", ErrInvalidInput)
	ErrNoDataForPeriod     = fmt.Errorf("no data found for the specified period")
)

// IsNotFound checks if the error is a "not found" error
func IsNotFound(err error) bool {
	return errors.Is(err, ErrNotFound)
}

// IsInvalidInput checks if the error is an "invalid input" error
func IsInvalidInput(err error) bool {
	return errors.Is(err, ErrInvalidInput)
}

// IsUnauthorized checks if the error is an "unauthorized" error
func IsUnauthorized(err error) bool {
	return errors.Is(err, ErrUnauthorized)
}

// IsAlreadyExists checks if the error is an "already exists" error
func IsAlreadyExists(err error) bool {
	return errors.Is(err, ErrAlreadyExists)
}

// IsRequired checks if the error is a "required" error
func IsRequired(err error) bool {
	return errors.Is(err, ErrRequired)
}

// IsInvalidFormat checks if the error is an "invalid format" error
func IsInvalidFormat(err error) bool {
	return errors.Is(err, ErrInvalidFormat)
}
