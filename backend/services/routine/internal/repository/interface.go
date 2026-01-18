package repository

import (
	"context"

	"github.com/kensan/backend/services/routine/internal"
)

// Repository defines the interface for routine task data access
type Repository interface {
	// ListRoutines returns all routine tasks for a user with optional filters
	ListRoutines(ctx context.Context, userID string, filter routine.RoutineFilter) ([]routine.RoutineTask, error)

	// GetRoutineByID returns a routine task by ID for a specific user
	GetRoutineByID(ctx context.Context, userID, routineID string) (*routine.RoutineTask, error)

	// CreateRoutine creates a new routine task
	CreateRoutine(ctx context.Context, userID string, input routine.CreateRoutineInput) (*routine.RoutineTask, error)

	// UpdateRoutine updates an existing routine task
	UpdateRoutine(ctx context.Context, userID, routineID string, input routine.UpdateRoutineInput) (*routine.RoutineTask, error)

	// ToggleRoutineEnabled toggles the enabled status of a routine task
	ToggleRoutineEnabled(ctx context.Context, userID, routineID string) (*routine.RoutineTask, error)

	// DeleteRoutine deletes a routine task
	DeleteRoutine(ctx context.Context, userID, routineID string) error
}
