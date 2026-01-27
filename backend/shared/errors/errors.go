// Package errors provides common error types and utilities for all services.
package errors

import (
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgconn"
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
	ErrTodoNotFound       = NotFound("todo")
	ErrEntityMemoNotFound = NotFound("entity memo")
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
	ErrTagExists           = AlreadyExists("tag")
	ErrNoteExists          = AlreadyExists("note")
	ErrTimerAlreadyRunning = AlreadyExists("timer")
	ErrTodoCompletionExists = AlreadyExists("todo completion")
	ErrNoDataForPeriod     = fmt.Errorf("no data found for the specified period")
)

// Validation errors for domain-specific validation
var (
	// ErrInvalidStatus is returned when an invalid status value is provided
	ErrInvalidStatus = fmt.Errorf("invalid status: %w", ErrInvalidInput)

	// ErrInvalidEntityType is returned when an invalid entity type is provided
	ErrInvalidEntityType = fmt.Errorf("invalid entity type: %w", ErrInvalidInput)

	// ErrInvalidFrequency is returned when an invalid frequency value is provided
	ErrInvalidFrequency = fmt.Errorf("invalid frequency: %w", ErrInvalidInput)
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

// ============================================================
// Entity-specific "not found" error helper functions
// These functions return errors that wrap ErrNotFound for consistent error handling
// ============================================================

// TaskNotFound returns a task not found error
func TaskNotFound() error { return ErrTaskNotFound }

// GoalNotFound returns a goal not found error
func GoalNotFound() error { return ErrGoalNotFound }

// MilestoneNotFound returns a milestone not found error
func MilestoneNotFound() error { return ErrMilestoneNotFound }

// TagNotFound returns a tag not found error
func TagNotFound() error { return ErrTagNotFound }

// TimeBlockNotFound returns a time block not found error
func TimeBlockNotFound() error { return ErrTimeBlockNotFound }

// TimeEntryNotFound returns a time entry not found error
func TimeEntryNotFound() error { return ErrTimeEntryNotFound }

// UserNotFound returns a user not found error
func UserNotFound() error { return ErrUserNotFound }

// NoteNotFound returns a note not found error
func NoteNotFound() error { return NotFound("note") }

// MemoNotFound returns a memo not found error
func MemoNotFound() error { return ErrMemoNotFound }

// DiaryNotFound returns a diary entry not found error
func DiaryNotFound() error { return ErrDiaryNotFound }

// RecordNotFound returns a learning record not found error
func RecordNotFound() error { return ErrRecordNotFound }

// RoutineNotFound returns a routine task not found error
func RoutineNotFound() error { return ErrRoutineNotFound }

// TodoNotFound returns a todo not found error
func TodoNotFound() error { return ErrTodoNotFound }

// EntityMemoNotFound returns an entity memo not found error
func EntityMemoNotFound() error { return ErrEntityMemoNotFound }

// TimerNotFound returns a timer not found error
func TimerNotFound() error { return ErrTimerNotFound }

// ============================================================
// Validation error helper functions
// These functions return errors that wrap ErrInvalidInput for consistent error handling
// ============================================================

// InvalidStatus returns an invalid status error for a specific entity
func InvalidStatus(entity string) error {
	return fmt.Errorf("invalid %s status: %w", entity, ErrInvalidInput)
}

// InvalidDate returns an invalid date error
func InvalidDate() error { return ErrInvalidDate }

// InvalidFrequency returns an invalid frequency error
func InvalidFrequency() error { return ErrInvalidFrequency }

// InvalidEntityType returns an invalid entity type error
func InvalidEntityType() error { return ErrInvalidEntityType }

// InvalidTime returns an invalid time error
func InvalidTime() error { return ErrInvalidTime }

// InvalidInput returns an invalid input error
func InvalidInput() error { return ErrInvalidInput }

// RequiredField returns a required field error
func RequiredField(field string) error { return Required(field) }

// ============================================================
// PostgreSQL error helpers
// ============================================================

// PostgreSQL error codes
const (
	// PgUniqueViolation is the PostgreSQL error code for unique constraint violations
	PgUniqueViolation = "23505"
	// PgForeignKeyViolation is the PostgreSQL error code for foreign key violations
	PgForeignKeyViolation = "23503"
	// PgNotNullViolation is the PostgreSQL error code for not-null violations
	PgNotNullViolation = "23502"
	// PgCheckViolation is the PostgreSQL error code for check constraint violations
	PgCheckViolation = "23514"
)

// IsUniqueViolation checks if the error is a PostgreSQL unique constraint violation
func IsUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == PgUniqueViolation
	}
	return false
}

// IsForeignKeyViolation checks if the error is a PostgreSQL foreign key violation
func IsForeignKeyViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == PgForeignKeyViolation
	}
	return false
}

// GetPgErrorCode returns the PostgreSQL error code if the error is a PgError, empty string otherwise
func GetPgErrorCode(err error) string {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code
	}
	return ""
}

// GetPgErrorConstraint returns the constraint name if the error is a PgError, empty string otherwise
func GetPgErrorConstraint(err error) string {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.ConstraintName
	}
	return ""
}
