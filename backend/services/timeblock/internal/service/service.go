package service

import (
	"context"
	"errors"
	"regexp"

	"github.com/kensan/backend/services/timeblock/internal"
	"github.com/kensan/backend/services/timeblock/internal/repository"
)

var (
	ErrTimeBlockNotFound = errors.New("time block not found")
	ErrTimeEntryNotFound = errors.New("time entry not found")
	ErrInvalidGoalTag    = errors.New("invalid goal tag")
	ErrInvalidInput      = errors.New("invalid input")
	ErrInvalidDate       = errors.New("invalid date format (expected YYYY-MM-DD)")
	ErrInvalidTime       = errors.New("invalid time format (expected HH:mm)")
)

// dateRegex matches YYYY-MM-DD format
var dateRegex = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)

// timeRegex matches HH:mm format
var timeRegex = regexp.MustCompile(`^\d{2}:\d{2}$`)

// Service handles business logic for time blocks and time entries
type Service struct {
	repo repository.Repository
}

// NewService creates a new timeblock service
func NewService(repo repository.Repository) *Service {
	return &Service{repo: repo}
}

// validateDate validates that a date string is in YYYY-MM-DD format
func validateDate(date string) bool {
	return dateRegex.MatchString(date)
}

// validateTime validates that a time string is in HH:mm format
func validateTime(t string) bool {
	return timeRegex.MatchString(t)
}

// ========== TimeBlock Operations ==========

// ListTimeBlocks returns all time blocks for a user with optional filters
func (s *Service) ListTimeBlocks(ctx context.Context, userID string, filter timeblock.TimeBlockFilter) ([]timeblock.TimeBlock, error) {
	// Validate date filters
	if filter.Date != nil && !validateDate(*filter.Date) {
		return nil, ErrInvalidDate
	}
	if filter.StartDate != nil && !validateDate(*filter.StartDate) {
		return nil, ErrInvalidDate
	}
	if filter.EndDate != nil && !validateDate(*filter.EndDate) {
		return nil, ErrInvalidDate
	}

	blocks, err := s.repo.ListTimeBlocks(ctx, userID, filter)
	if err != nil {
		return nil, err
	}

	if blocks == nil {
		return []timeblock.TimeBlock{}, nil
	}

	return blocks, nil
}

// GetTimeBlock returns a time block by ID
func (s *Service) GetTimeBlock(ctx context.Context, userID, timeBlockID string) (*timeblock.TimeBlock, error) {
	tb, err := s.repo.GetTimeBlockByID(ctx, userID, timeBlockID)
	if err != nil {
		return nil, err
	}

	if tb == nil {
		return nil, ErrTimeBlockNotFound
	}

	return tb, nil
}

// CreateTimeBlock creates a new time block
func (s *Service) CreateTimeBlock(ctx context.Context, userID string, input timeblock.CreateTimeBlockInput) (*timeblock.TimeBlock, error) {
	// Validate required fields
	if input.TaskName == "" {
		return nil, ErrInvalidInput
	}

	if input.Date == "" || !validateDate(input.Date) {
		return nil, ErrInvalidDate
	}

	if input.StartTime == "" || !validateTime(input.StartTime) {
		return nil, ErrInvalidTime
	}

	if input.EndTime == "" || !validateTime(input.EndTime) {
		return nil, ErrInvalidTime
	}

	if input.GoalTag != nil && !input.GoalTag.IsValid() {
		return nil, ErrInvalidGoalTag
	}

	return s.repo.CreateTimeBlock(ctx, userID, input)
}

// UpdateTimeBlock updates an existing time block
func (s *Service) UpdateTimeBlock(ctx context.Context, userID, timeBlockID string, input timeblock.UpdateTimeBlockInput) (*timeblock.TimeBlock, error) {
	// Check if time block exists and belongs to user
	existing, err := s.repo.GetTimeBlockByID(ctx, userID, timeBlockID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, ErrTimeBlockNotFound
	}

	// Validate optional fields if provided
	if input.Date != nil && !validateDate(*input.Date) {
		return nil, ErrInvalidDate
	}

	if input.StartTime != nil && !validateTime(*input.StartTime) {
		return nil, ErrInvalidTime
	}

	if input.EndTime != nil && !validateTime(*input.EndTime) {
		return nil, ErrInvalidTime
	}

	if input.GoalTag != nil && !input.GoalTag.IsValid() {
		return nil, ErrInvalidGoalTag
	}

	tb, err := s.repo.UpdateTimeBlock(ctx, userID, timeBlockID, input)
	if err != nil {
		return nil, err
	}

	if tb == nil {
		return nil, ErrTimeBlockNotFound
	}

	return tb, nil
}

// DeleteTimeBlock deletes a time block
func (s *Service) DeleteTimeBlock(ctx context.Context, userID, timeBlockID string) error {
	// Check if time block exists and belongs to user
	existing, err := s.repo.GetTimeBlockByID(ctx, userID, timeBlockID)
	if err != nil {
		return err
	}
	if existing == nil {
		return ErrTimeBlockNotFound
	}

	return s.repo.DeleteTimeBlock(ctx, userID, timeBlockID)
}

// GenerateFromRoutines generates time blocks from routine tasks for a given date
// NOTE: This is a simplified implementation. Full integration with Routine Service will be added later via gRPC.
func (s *Service) GenerateFromRoutines(ctx context.Context, userID string, input timeblock.GenerateFromRoutinesInput) (*timeblock.GenerateFromRoutinesResult, error) {
	// Validate date
	if input.Date == "" || !validateDate(input.Date) {
		return nil, ErrInvalidDate
	}

	// TODO: In the future, this will call the Routine Service via gRPC to get routine tasks
	// For now, return an empty result as a placeholder implementation

	result := &timeblock.GenerateFromRoutinesResult{
		Generated: 0,
		Blocks:    []timeblock.TimeBlock{},
	}

	return result, nil
}

// ========== TimeEntry Operations ==========

// ListTimeEntries returns all time entries for a user with optional filters
func (s *Service) ListTimeEntries(ctx context.Context, userID string, filter timeblock.TimeEntryFilter) ([]timeblock.TimeEntry, error) {
	// Validate date filters
	if filter.Date != nil && !validateDate(*filter.Date) {
		return nil, ErrInvalidDate
	}
	if filter.StartDate != nil && !validateDate(*filter.StartDate) {
		return nil, ErrInvalidDate
	}
	if filter.EndDate != nil && !validateDate(*filter.EndDate) {
		return nil, ErrInvalidDate
	}

	if filter.GoalTag != nil && !filter.GoalTag.IsValid() {
		return nil, ErrInvalidGoalTag
	}

	entries, err := s.repo.ListTimeEntries(ctx, userID, filter)
	if err != nil {
		return nil, err
	}

	if entries == nil {
		return []timeblock.TimeEntry{}, nil
	}

	return entries, nil
}

// GetTimeEntry returns a time entry by ID
func (s *Service) GetTimeEntry(ctx context.Context, userID, timeEntryID string) (*timeblock.TimeEntry, error) {
	te, err := s.repo.GetTimeEntryByID(ctx, userID, timeEntryID)
	if err != nil {
		return nil, err
	}

	if te == nil {
		return nil, ErrTimeEntryNotFound
	}

	return te, nil
}

// CreateTimeEntry creates a new time entry
func (s *Service) CreateTimeEntry(ctx context.Context, userID string, input timeblock.CreateTimeEntryInput) (*timeblock.TimeEntry, error) {
	// Validate required fields
	if input.TaskName == "" {
		return nil, ErrInvalidInput
	}

	if input.Date == "" || !validateDate(input.Date) {
		return nil, ErrInvalidDate
	}

	if input.StartTime == "" || !validateTime(input.StartTime) {
		return nil, ErrInvalidTime
	}

	if input.EndTime == "" || !validateTime(input.EndTime) {
		return nil, ErrInvalidTime
	}

	if input.GoalTag != nil && !input.GoalTag.IsValid() {
		return nil, ErrInvalidGoalTag
	}

	return s.repo.CreateTimeEntry(ctx, userID, input)
}

// UpdateTimeEntry updates an existing time entry
func (s *Service) UpdateTimeEntry(ctx context.Context, userID, timeEntryID string, input timeblock.UpdateTimeEntryInput) (*timeblock.TimeEntry, error) {
	// Check if time entry exists and belongs to user
	existing, err := s.repo.GetTimeEntryByID(ctx, userID, timeEntryID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, ErrTimeEntryNotFound
	}

	// Validate optional fields if provided
	if input.Date != nil && !validateDate(*input.Date) {
		return nil, ErrInvalidDate
	}

	if input.StartTime != nil && !validateTime(*input.StartTime) {
		return nil, ErrInvalidTime
	}

	if input.EndTime != nil && !validateTime(*input.EndTime) {
		return nil, ErrInvalidTime
	}

	if input.GoalTag != nil && !input.GoalTag.IsValid() {
		return nil, ErrInvalidGoalTag
	}

	te, err := s.repo.UpdateTimeEntry(ctx, userID, timeEntryID, input)
	if err != nil {
		return nil, err
	}

	if te == nil {
		return nil, ErrTimeEntryNotFound
	}

	return te, nil
}

// DeleteTimeEntry deletes a time entry
func (s *Service) DeleteTimeEntry(ctx context.Context, userID, timeEntryID string) error {
	// Check if time entry exists and belongs to user
	existing, err := s.repo.GetTimeEntryByID(ctx, userID, timeEntryID)
	if err != nil {
		return err
	}
	if existing == nil {
		return ErrTimeEntryNotFound
	}

	return s.repo.DeleteTimeEntry(ctx, userID, timeEntryID)
}
