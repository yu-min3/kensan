package service

import (
	"context"

	routine "github.com/kensan/backend/services/routine/internal"
)

// RoutineService defines the interface for routine-related operations
type RoutineService interface {
	ListRoutines(ctx context.Context, userID string, filter routine.RoutineFilter) ([]routine.RoutineTask, error)
	GetRoutine(ctx context.Context, userID, routineID string) (*routine.RoutineTask, error)
	CreateRoutine(ctx context.Context, userID string, input routine.CreateRoutineInput) (*routine.RoutineTask, error)
	UpdateRoutine(ctx context.Context, userID, routineID string, input routine.UpdateRoutineInput) (*routine.RoutineTask, error)
	ToggleRoutineEnabled(ctx context.Context, userID, routineID string) (*routine.RoutineTask, error)
	DeleteRoutine(ctx context.Context, userID, routineID string) error
}

// Compile-time check to ensure Service implements RoutineService
var _ RoutineService = (*Service)(nil)
