package service

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"time"

	"github.com/kensan/backend/services/timeblock/internal"
	"github.com/kensan/backend/services/timeblock/internal/repository"
)

var (
	ErrTimeBlockNotFound   = errors.New("time block not found")
	ErrTimeEntryNotFound   = errors.New("time entry not found")
	ErrRunningTimerNotFound = errors.New("no running timer found")
	ErrTimerAlreadyRunning = errors.New("timer is already running")
	ErrInvalidGoalTag      = errors.New("invalid goal tag")
	ErrInvalidInput        = errors.New("invalid input")
	ErrInvalidDate         = errors.New("invalid date format (expected YYYY-MM-DD)")
	ErrInvalidTime         = errors.New("invalid time format (expected HH:mm)")
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

// convertUTCToLocalDateTime converts UTC date and time to local timezone
// utcDate format: "YYYY-MM-DD", utcTime format: "HH:mm:ss"
// Returns localDate, localTime in the same formats
func convertUTCToLocalDateTime(utcDate, utcTime, timezone string) (string, string, error) {
	loc, err := time.LoadLocation(timezone)
	if err != nil {
		return "", "", fmt.Errorf("invalid timezone: %w", err)
	}

	// Parse UTC date and time (handle both HH:mm:ss and HH:mm formats)
	timeStr := utcTime
	if len(timeStr) == 5 {
		timeStr += ":00" // Add seconds if not present
	}

	utcTimeStr := fmt.Sprintf("%sT%sZ", utcDate, timeStr)
	utcParsed, err := time.Parse(time.RFC3339, utcTimeStr)
	if err != nil {
		return "", "", fmt.Errorf("failed to parse UTC datetime: %w", err)
	}

	// Convert to local timezone
	localTime := utcParsed.In(loc)

	localDate := localTime.Format("2006-01-02")
	localTimeStr := localTime.Format("15:04:05")

	return localDate, localTimeStr, nil
}

// ========== TimeBlock Operations ==========

// ListTimeBlocks returns all time blocks for a user with optional filters
// If timezone is provided (non-empty), date/time in the response will be converted to local time.
// If timezone is empty, date/time will be returned as stored (UTC).
func (s *Service) ListTimeBlocks(ctx context.Context, userID string, filter timeblock.TimeBlockFilter, timezone string) ([]timeblock.TimeBlock, error) {
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

	// Convert to local timezone if specified
	if timezone != "" {
		for i := range blocks {
			localDate, localStartTime, err := convertUTCToLocalDateTime(blocks[i].Date, blocks[i].StartTime, timezone)
			if err != nil {
				return nil, fmt.Errorf("failed to convert start time: %w", err)
			}
			_, localEndTime, err := convertUTCToLocalDateTime(blocks[i].Date, blocks[i].EndTime, timezone)
			if err != nil {
				return nil, fmt.Errorf("failed to convert end time: %w", err)
			}
			blocks[i].Date = localDate
			blocks[i].StartTime = localStartTime
			blocks[i].EndTime = localEndTime
		}
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
// If timezone is provided (non-empty), date/time in the response will be converted to local time.
// If timezone is empty, date/time will be returned as stored (UTC).
func (s *Service) ListTimeEntries(ctx context.Context, userID string, filter timeblock.TimeEntryFilter, timezone string) ([]timeblock.TimeEntry, error) {
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

	// Convert to local timezone if specified
	if timezone != "" {
		for i := range entries {
			localDate, localStartTime, err := convertUTCToLocalDateTime(entries[i].Date, entries[i].StartTime, timezone)
			if err != nil {
				return nil, fmt.Errorf("failed to convert start time: %w", err)
			}
			_, localEndTime, err := convertUTCToLocalDateTime(entries[i].Date, entries[i].EndTime, timezone)
			if err != nil {
				return nil, fmt.Errorf("failed to convert end time: %w", err)
			}
			entries[i].Date = localDate
			entries[i].StartTime = localStartTime
			entries[i].EndTime = localEndTime
		}
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

// ========== Timer Operations ==========

// GetRunningTimer returns the current running timer for a user
func (s *Service) GetRunningTimer(ctx context.Context, userID string) (*timeblock.RunningTimer, error) {
	return s.repo.GetRunningTimer(ctx, userID)
}

// StartTimer starts a new timer for a user
func (s *Service) StartTimer(ctx context.Context, userID string, input timeblock.StartTimerInput) (*timeblock.RunningTimer, error) {
	// Validate required fields
	if input.TaskName == "" {
		return nil, ErrInvalidInput
	}

	if input.GoalTag != nil && !input.GoalTag.IsValid() {
		return nil, ErrInvalidGoalTag
	}

	// Check if a timer is already running
	existing, err := s.repo.GetRunningTimer(ctx, userID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, ErrTimerAlreadyRunning
	}

	return s.repo.StartTimer(ctx, userID, input)
}

// StopTimer stops the current timer and creates a time entry
func (s *Service) StopTimer(ctx context.Context, userID string) (*timeblock.StopTimerResult, error) {
	// Check if a timer is running
	timer, err := s.repo.GetRunningTimer(ctx, userID)
	if err != nil {
		return nil, err
	}
	if timer == nil {
		return nil, ErrRunningTimerNotFound
	}

	// Stop the timer and create a time entry
	entry, err := s.repo.StopTimer(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Calculate duration
	duration := time.Since(timer.StartedAt).Seconds()

	return &timeblock.StopTimerResult{
		TimeEntry: entry,
		Duration:  int64(duration),
	}, nil
}
