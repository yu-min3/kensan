package service

import (
	"context"

	"github.com/kensan/backend/services/routine/internal"
	"github.com/kensan/backend/services/routine/internal/repository"
	"github.com/kensan/backend/shared/errors"
)

// Re-export shared errors for backward compatibility with handlers
var (
	ErrRoutineNotFound  = errors.ErrRoutineNotFound
	ErrInvalidFrequency = errors.ErrInvalidFrequency
	ErrInvalidInput     = errors.ErrInvalidInput
)

// Service handles business logic for routine tasks
type Service struct {
	repo repository.Repository
}

// NewService creates a new routine service
func NewService(repo repository.Repository) *Service {
	return &Service{repo: repo}
}

// ListRoutines returns all routine tasks for a user with optional filters
func (s *Service) ListRoutines(ctx context.Context, userID string, filter routine.RoutineFilter) ([]routine.RoutineTask, error) {
	routines, err := s.repo.ListRoutines(ctx, userID, filter)
	if err != nil {
		return nil, err
	}

	if routines == nil {
		return []routine.RoutineTask{}, nil
	}

	// If for_date filter is specified, filter by day of week
	if filter.ForDate != nil {
		dayOfWeek := int(filter.ForDate.Weekday())
		var filtered []routine.RoutineTask
		for _, r := range routines {
			if r.MatchesDayOfWeek(dayOfWeek) {
				filtered = append(filtered, r)
			}
		}
		if filtered == nil {
			return []routine.RoutineTask{}, nil
		}
		return filtered, nil
	}

	return routines, nil
}

// GetRoutine returns a routine task by ID
func (s *Service) GetRoutine(ctx context.Context, userID, routineID string) (*routine.RoutineTask, error) {
	rt, err := s.repo.GetRoutineByID(ctx, userID, routineID)
	if err != nil {
		return nil, err
	}

	if rt == nil {
		return nil, ErrRoutineNotFound
	}

	return rt, nil
}

// CreateRoutine creates a new routine task
func (s *Service) CreateRoutine(ctx context.Context, userID string, input routine.CreateRoutineInput) (*routine.RoutineTask, error) {
	if input.Name == "" {
		return nil, ErrInvalidInput
	}

	if !input.Frequency.IsValid() {
		return nil, ErrInvalidFrequency
	}

	// Validate days of week (0-6)
	for _, day := range input.DaysOfWeek {
		if day < 0 || day > 6 {
			return nil, ErrInvalidInput
		}
	}

	// For weekly/monthly/custom frequencies, days of week should be specified
	if (input.Frequency == routine.FrequencyWeekly ||
		input.Frequency == routine.FrequencyMonthly ||
		input.Frequency == routine.FrequencyCustom) && len(input.DaysOfWeek) == 0 {
		return nil, ErrInvalidInput
	}

	return s.repo.CreateRoutine(ctx, userID, input)
}

// UpdateRoutine updates an existing routine task
func (s *Service) UpdateRoutine(ctx context.Context, userID, routineID string, input routine.UpdateRoutineInput) (*routine.RoutineTask, error) {
	// Check if routine exists and belongs to user
	existing, err := s.repo.GetRoutineByID(ctx, userID, routineID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, ErrRoutineNotFound
	}

	if input.Frequency != nil && !input.Frequency.IsValid() {
		return nil, ErrInvalidFrequency
	}

	// Validate days of week (0-6)
	for _, day := range input.DaysOfWeek {
		if day < 0 || day > 6 {
			return nil, ErrInvalidInput
		}
	}

	rt, err := s.repo.UpdateRoutine(ctx, userID, routineID, input)
	if err != nil {
		return nil, err
	}

	if rt == nil {
		return nil, ErrRoutineNotFound
	}

	return rt, nil
}

// ToggleRoutineEnabled toggles the enabled status of a routine task
func (s *Service) ToggleRoutineEnabled(ctx context.Context, userID, routineID string) (*routine.RoutineTask, error) {
	// Check if routine exists and belongs to user
	existing, err := s.repo.GetRoutineByID(ctx, userID, routineID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, ErrRoutineNotFound
	}

	rt, err := s.repo.ToggleRoutineEnabled(ctx, userID, routineID)
	if err != nil {
		return nil, err
	}

	if rt == nil {
		return nil, ErrRoutineNotFound
	}

	return rt, nil
}

// DeleteRoutine deletes a routine task
func (s *Service) DeleteRoutine(ctx context.Context, userID, routineID string) error {
	// Check if routine exists and belongs to user
	existing, err := s.repo.GetRoutineByID(ctx, userID, routineID)
	if err != nil {
		return err
	}
	if existing == nil {
		return ErrRoutineNotFound
	}

	return s.repo.DeleteRoutine(ctx, userID, routineID)
}
