package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/kensan/backend/services/routine/internal"
	"github.com/kensan/backend/services/routine/internal/repository"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// Compile-time check: MockRepository must implement repository.Repository
var _ repository.Repository = (*MockRepository)(nil)

// MockRepository is a mock implementation of the repository.Repository interface
type MockRepository struct {
	mock.Mock
}

func (m *MockRepository) ListRoutines(ctx context.Context, userID string, filter routine.RoutineFilter) ([]routine.RoutineTask, error) {
	args := m.Called(ctx, userID, filter)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]routine.RoutineTask), args.Error(1)
}

func (m *MockRepository) GetRoutineByID(ctx context.Context, userID, routineID string) (*routine.RoutineTask, error) {
	args := m.Called(ctx, userID, routineID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*routine.RoutineTask), args.Error(1)
}

func (m *MockRepository) CreateRoutine(ctx context.Context, userID string, input routine.CreateRoutineInput) (*routine.RoutineTask, error) {
	args := m.Called(ctx, userID, input)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*routine.RoutineTask), args.Error(1)
}

func (m *MockRepository) UpdateRoutine(ctx context.Context, userID, routineID string, input routine.UpdateRoutineInput) (*routine.RoutineTask, error) {
	args := m.Called(ctx, userID, routineID, input)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*routine.RoutineTask), args.Error(1)
}

func (m *MockRepository) ToggleRoutineEnabled(ctx context.Context, userID, routineID string) (*routine.RoutineTask, error) {
	args := m.Called(ctx, userID, routineID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*routine.RoutineTask), args.Error(1)
}

func (m *MockRepository) DeleteRoutine(ctx context.Context, userID, routineID string) error {
	args := m.Called(ctx, userID, routineID)
	return args.Error(0)
}

// ========== ListRoutines Tests ==========

func TestListRoutines_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	filter := routine.RoutineFilter{}

	expectedRoutines := []routine.RoutineTask{
		{ID: "r1", Name: "Morning Routine", Frequency: routine.FrequencyDaily, Enabled: true},
		{ID: "r2", Name: "Weekly Review", Frequency: routine.FrequencyWeekly, DaysOfWeek: []int{0}, Enabled: true},
	}

	mockRepo.On("ListRoutines", ctx, userID, filter).Return(expectedRoutines, nil)

	routines, err := svc.ListRoutines(ctx, userID, filter)

	assert.NoError(t, err)
	assert.Len(t, routines, 2)
	assert.Equal(t, "Morning Routine", routines[0].Name)
	mockRepo.AssertExpectations(t)
}

func TestListRoutines_EmptyResult(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	filter := routine.RoutineFilter{}

	mockRepo.On("ListRoutines", ctx, userID, filter).Return([]routine.RoutineTask{}, nil)

	routines, err := svc.ListRoutines(ctx, userID, filter)

	assert.NoError(t, err)
	assert.Empty(t, routines)
	mockRepo.AssertExpectations(t)
}

func TestListRoutines_NilResult(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	filter := routine.RoutineFilter{}

	mockRepo.On("ListRoutines", ctx, userID, filter).Return(nil, nil)

	routines, err := svc.ListRoutines(ctx, userID, filter)

	assert.NoError(t, err)
	assert.NotNil(t, routines)
	assert.Empty(t, routines)
	mockRepo.AssertExpectations(t)
}

func TestListRoutines_WithEnabledFilter(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	enabled := true
	filter := routine.RoutineFilter{
		Enabled: &enabled,
	}

	expectedRoutines := []routine.RoutineTask{
		{ID: "r1", Name: "Active Routine", Enabled: true},
	}

	mockRepo.On("ListRoutines", ctx, userID, filter).Return(expectedRoutines, nil)

	routines, err := svc.ListRoutines(ctx, userID, filter)

	assert.NoError(t, err)
	assert.Len(t, routines, 1)
	assert.True(t, routines[0].Enabled)
	mockRepo.AssertExpectations(t)
}

func TestListRoutines_WithForDateFilter(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	// Monday
	monday := time.Date(2025, 1, 6, 0, 0, 0, 0, time.UTC)
	filter := routine.RoutineFilter{
		ForDate: &monday,
	}

	// Repository returns all routines, service filters by day
	allRoutines := []routine.RoutineTask{
		{ID: "r1", Name: "Daily Task", Frequency: routine.FrequencyDaily},
		{ID: "r2", Name: "Monday Task", Frequency: routine.FrequencyWeekly, DaysOfWeek: []int{1}},
		{ID: "r3", Name: "Friday Task", Frequency: routine.FrequencyWeekly, DaysOfWeek: []int{5}},
	}

	mockRepo.On("ListRoutines", ctx, userID, filter).Return(allRoutines, nil)

	routines, err := svc.ListRoutines(ctx, userID, filter)

	assert.NoError(t, err)
	assert.Len(t, routines, 2) // Daily and Monday tasks
	assert.Equal(t, "Daily Task", routines[0].Name)
	assert.Equal(t, "Monday Task", routines[1].Name)
	mockRepo.AssertExpectations(t)
}

func TestListRoutines_RepositoryError(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	filter := routine.RoutineFilter{}

	mockRepo.On("ListRoutines", ctx, userID, filter).Return(nil, errors.New("database error"))

	routines, err := svc.ListRoutines(ctx, userID, filter)

	assert.Error(t, err)
	assert.Nil(t, routines)
	assert.Contains(t, err.Error(), "database error")
	mockRepo.AssertExpectations(t)
}

// ========== GetRoutine Tests ==========

func TestGetRoutine_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	routineID := "r-123"

	expectedRoutine := &routine.RoutineTask{
		ID:               routineID,
		UserID:           userID,
		Name:             "Daily Standup",
		Frequency:        routine.FrequencyDaily,
		EstimatedMinutes: 15,
		Enabled:          true,
	}

	mockRepo.On("GetRoutineByID", ctx, userID, routineID).Return(expectedRoutine, nil)

	rt, err := svc.GetRoutine(ctx, userID, routineID)

	assert.NoError(t, err)
	assert.NotNil(t, rt)
	assert.Equal(t, "Daily Standup", rt.Name)
	assert.Equal(t, routine.FrequencyDaily, rt.Frequency)
	mockRepo.AssertExpectations(t)
}

func TestGetRoutine_NotFound(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	routineID := "nonexistent"

	mockRepo.On("GetRoutineByID", ctx, userID, routineID).Return(nil, nil)

	rt, err := svc.GetRoutine(ctx, userID, routineID)

	assert.Error(t, err)
	assert.ErrorIs(t, err, ErrRoutineNotFound)
	assert.Nil(t, rt)
	mockRepo.AssertExpectations(t)
}

func TestGetRoutine_RepositoryError(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	routineID := "r-123"

	mockRepo.On("GetRoutineByID", ctx, userID, routineID).Return(nil, errors.New("database error"))

	rt, err := svc.GetRoutine(ctx, userID, routineID)

	assert.Error(t, err)
	assert.Nil(t, rt)
	assert.Contains(t, err.Error(), "database error")
	mockRepo.AssertExpectations(t)
}

// ========== CreateRoutine Tests ==========

func TestCreateRoutine_DailySuccess(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	input := routine.CreateRoutineInput{
		Name:             "Morning Exercise",
		Frequency:        routine.FrequencyDaily,
		EstimatedMinutes: 30,
		Enabled:          true,
	}

	expectedRoutine := &routine.RoutineTask{
		ID:               "r-new",
		UserID:           userID,
		Name:             "Morning Exercise",
		Frequency:        routine.FrequencyDaily,
		EstimatedMinutes: 30,
		Enabled:          true,
	}

	mockRepo.On("CreateRoutine", ctx, userID, input).Return(expectedRoutine, nil)

	rt, err := svc.CreateRoutine(ctx, userID, input)

	assert.NoError(t, err)
	assert.NotNil(t, rt)
	assert.Equal(t, "Morning Exercise", rt.Name)
	assert.Equal(t, routine.FrequencyDaily, rt.Frequency)
	mockRepo.AssertExpectations(t)
}

func TestCreateRoutine_WeeklySuccess(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	input := routine.CreateRoutineInput{
		Name:             "Weekly Review",
		Frequency:        routine.FrequencyWeekly,
		DaysOfWeek:       []int{0, 5}, // Sunday and Friday
		EstimatedMinutes: 60,
		Enabled:          true,
	}

	expectedRoutine := &routine.RoutineTask{
		ID:               "r-weekly",
		UserID:           userID,
		Name:             "Weekly Review",
		Frequency:        routine.FrequencyWeekly,
		DaysOfWeek:       []int{0, 5},
		EstimatedMinutes: 60,
		Enabled:          true,
	}

	mockRepo.On("CreateRoutine", ctx, userID, input).Return(expectedRoutine, nil)

	rt, err := svc.CreateRoutine(ctx, userID, input)

	assert.NoError(t, err)
	assert.NotNil(t, rt)
	assert.Equal(t, []int{0, 5}, rt.DaysOfWeek)
	mockRepo.AssertExpectations(t)
}

func TestCreateRoutine_EmptyName(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	input := routine.CreateRoutineInput{
		Name:      "",
		Frequency: routine.FrequencyDaily,
	}

	rt, err := svc.CreateRoutine(ctx, userID, input)

	assert.Error(t, err)
	assert.ErrorIs(t, err, ErrInvalidInput)
	assert.Nil(t, rt)
	mockRepo.AssertNotCalled(t, "CreateRoutine")
}

func TestCreateRoutine_InvalidFrequency(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	input := routine.CreateRoutineInput{
		Name:      "Test Routine",
		Frequency: routine.RoutineFrequency("invalid"),
	}

	rt, err := svc.CreateRoutine(ctx, userID, input)

	assert.Error(t, err)
	assert.ErrorIs(t, err, ErrInvalidFrequency)
	assert.Nil(t, rt)
	mockRepo.AssertNotCalled(t, "CreateRoutine")
}

func TestCreateRoutine_InvalidDayOfWeek(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	input := routine.CreateRoutineInput{
		Name:       "Test Routine",
		Frequency:  routine.FrequencyWeekly,
		DaysOfWeek: []int{7}, // Invalid: should be 0-6
	}

	rt, err := svc.CreateRoutine(ctx, userID, input)

	assert.Error(t, err)
	assert.ErrorIs(t, err, ErrInvalidInput)
	assert.Nil(t, rt)
	mockRepo.AssertNotCalled(t, "CreateRoutine")
}

func TestCreateRoutine_WeeklyWithoutDaysOfWeek(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	input := routine.CreateRoutineInput{
		Name:       "Weekly Review",
		Frequency:  routine.FrequencyWeekly,
		DaysOfWeek: []int{}, // Empty days of week for weekly
	}

	rt, err := svc.CreateRoutine(ctx, userID, input)

	assert.Error(t, err)
	assert.ErrorIs(t, err, ErrInvalidInput)
	assert.Nil(t, rt)
	mockRepo.AssertNotCalled(t, "CreateRoutine")
}

func TestCreateRoutine_RepositoryError(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	input := routine.CreateRoutineInput{
		Name:      "Test Routine",
		Frequency: routine.FrequencyDaily,
	}

	mockRepo.On("CreateRoutine", ctx, userID, input).Return(nil, errors.New("database error"))

	rt, err := svc.CreateRoutine(ctx, userID, input)

	assert.Error(t, err)
	assert.Nil(t, rt)
	assert.Contains(t, err.Error(), "database error")
	mockRepo.AssertExpectations(t)
}

// ========== UpdateRoutine Tests ==========

func TestUpdateRoutine_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	routineID := "r-123"
	newName := "Updated Routine"
	newMinutes := 45
	input := routine.UpdateRoutineInput{
		Name:             &newName,
		EstimatedMinutes: &newMinutes,
	}

	existingRoutine := &routine.RoutineTask{
		ID:               routineID,
		UserID:           userID,
		Name:             "Old Name",
		EstimatedMinutes: 30,
	}

	expectedRoutine := &routine.RoutineTask{
		ID:               routineID,
		UserID:           userID,
		Name:             newName,
		EstimatedMinutes: newMinutes,
	}

	mockRepo.On("GetRoutineByID", ctx, userID, routineID).Return(existingRoutine, nil)
	mockRepo.On("UpdateRoutine", ctx, userID, routineID, input).Return(expectedRoutine, nil)

	rt, err := svc.UpdateRoutine(ctx, userID, routineID, input)

	assert.NoError(t, err)
	assert.NotNil(t, rt)
	assert.Equal(t, "Updated Routine", rt.Name)
	assert.Equal(t, 45, rt.EstimatedMinutes)
	mockRepo.AssertExpectations(t)
}

func TestUpdateRoutine_NotFound(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	routineID := "nonexistent"
	newName := "Updated Name"
	input := routine.UpdateRoutineInput{
		Name: &newName,
	}

	mockRepo.On("GetRoutineByID", ctx, userID, routineID).Return(nil, nil)

	rt, err := svc.UpdateRoutine(ctx, userID, routineID, input)

	assert.Error(t, err)
	assert.ErrorIs(t, err, ErrRoutineNotFound)
	assert.Nil(t, rt)
	mockRepo.AssertNotCalled(t, "UpdateRoutine")
}

func TestUpdateRoutine_InvalidFrequency(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	routineID := "r-123"
	invalidFreq := routine.RoutineFrequency("invalid")
	input := routine.UpdateRoutineInput{
		Frequency: &invalidFreq,
	}

	existingRoutine := &routine.RoutineTask{
		ID:     routineID,
		UserID: userID,
	}

	mockRepo.On("GetRoutineByID", ctx, userID, routineID).Return(existingRoutine, nil)

	rt, err := svc.UpdateRoutine(ctx, userID, routineID, input)

	assert.Error(t, err)
	assert.ErrorIs(t, err, ErrInvalidFrequency)
	assert.Nil(t, rt)
	mockRepo.AssertNotCalled(t, "UpdateRoutine")
}

func TestUpdateRoutine_InvalidDayOfWeek(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	routineID := "r-123"
	input := routine.UpdateRoutineInput{
		DaysOfWeek: []int{-1}, // Invalid
	}

	existingRoutine := &routine.RoutineTask{
		ID:     routineID,
		UserID: userID,
	}

	mockRepo.On("GetRoutineByID", ctx, userID, routineID).Return(existingRoutine, nil)

	rt, err := svc.UpdateRoutine(ctx, userID, routineID, input)

	assert.Error(t, err)
	assert.ErrorIs(t, err, ErrInvalidInput)
	assert.Nil(t, rt)
	mockRepo.AssertNotCalled(t, "UpdateRoutine")
}

// ========== ToggleRoutineEnabled Tests ==========

func TestToggleRoutineEnabled_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	routineID := "r-123"

	existingRoutine := &routine.RoutineTask{
		ID:      routineID,
		UserID:  userID,
		Enabled: true,
	}

	expectedRoutine := &routine.RoutineTask{
		ID:      routineID,
		UserID:  userID,
		Enabled: false, // Toggled
	}

	mockRepo.On("GetRoutineByID", ctx, userID, routineID).Return(existingRoutine, nil)
	mockRepo.On("ToggleRoutineEnabled", ctx, userID, routineID).Return(expectedRoutine, nil)

	rt, err := svc.ToggleRoutineEnabled(ctx, userID, routineID)

	assert.NoError(t, err)
	assert.NotNil(t, rt)
	assert.False(t, rt.Enabled)
	mockRepo.AssertExpectations(t)
}

func TestToggleRoutineEnabled_NotFound(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	routineID := "nonexistent"

	mockRepo.On("GetRoutineByID", ctx, userID, routineID).Return(nil, nil)

	rt, err := svc.ToggleRoutineEnabled(ctx, userID, routineID)

	assert.Error(t, err)
	assert.ErrorIs(t, err, ErrRoutineNotFound)
	assert.Nil(t, rt)
	mockRepo.AssertNotCalled(t, "ToggleRoutineEnabled")
}

// ========== DeleteRoutine Tests ==========

func TestDeleteRoutine_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	routineID := "r-123"

	existingRoutine := &routine.RoutineTask{
		ID:     routineID,
		UserID: userID,
	}

	mockRepo.On("GetRoutineByID", ctx, userID, routineID).Return(existingRoutine, nil)
	mockRepo.On("DeleteRoutine", ctx, userID, routineID).Return(nil)

	err := svc.DeleteRoutine(ctx, userID, routineID)

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestDeleteRoutine_NotFound(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	routineID := "nonexistent"

	mockRepo.On("GetRoutineByID", ctx, userID, routineID).Return(nil, nil)

	err := svc.DeleteRoutine(ctx, userID, routineID)

	assert.Error(t, err)
	assert.ErrorIs(t, err, ErrRoutineNotFound)
	mockRepo.AssertNotCalled(t, "DeleteRoutine")
}

func TestDeleteRoutine_RepositoryError(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	routineID := "r-123"

	existingRoutine := &routine.RoutineTask{
		ID:     routineID,
		UserID: userID,
	}

	mockRepo.On("GetRoutineByID", ctx, userID, routineID).Return(existingRoutine, nil)
	mockRepo.On("DeleteRoutine", ctx, userID, routineID).Return(errors.New("database error"))

	err := svc.DeleteRoutine(ctx, userID, routineID)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "database error")
	mockRepo.AssertExpectations(t)
}

// ========== Frequency Validation Tests ==========

func TestRoutineFrequency_IsValid(t *testing.T) {
	testCases := []struct {
		frequency routine.RoutineFrequency
		expected  bool
	}{
		{routine.FrequencyDaily, true},
		{routine.FrequencyWeekly, true},
		{routine.FrequencyMonthly, true},
		{routine.FrequencyCustom, true},
		{routine.RoutineFrequency("invalid"), false},
		{routine.RoutineFrequency(""), false},
	}

	for _, tc := range testCases {
		t.Run(string(tc.frequency), func(t *testing.T) {
			result := tc.frequency.IsValid()
			assert.Equal(t, tc.expected, result)
		})
	}
}

// ========== MatchesDayOfWeek Tests ==========

func TestRoutineTask_MatchesDayOfWeek(t *testing.T) {
	t.Run("daily matches any day", func(t *testing.T) {
		rt := &routine.RoutineTask{
			Frequency: routine.FrequencyDaily,
		}
		for day := 0; day <= 6; day++ {
			assert.True(t, rt.MatchesDayOfWeek(day))
		}
	})

	t.Run("weekly matches specified days", func(t *testing.T) {
		rt := &routine.RoutineTask{
			Frequency:  routine.FrequencyWeekly,
			DaysOfWeek: []int{1, 3, 5}, // Mon, Wed, Fri
		}

		assert.False(t, rt.MatchesDayOfWeek(0)) // Sunday
		assert.True(t, rt.MatchesDayOfWeek(1))  // Monday
		assert.False(t, rt.MatchesDayOfWeek(2)) // Tuesday
		assert.True(t, rt.MatchesDayOfWeek(3))  // Wednesday
		assert.False(t, rt.MatchesDayOfWeek(4)) // Thursday
		assert.True(t, rt.MatchesDayOfWeek(5))  // Friday
		assert.False(t, rt.MatchesDayOfWeek(6)) // Saturday
	})

	t.Run("weekly with no days matches none", func(t *testing.T) {
		rt := &routine.RoutineTask{
			Frequency:  routine.FrequencyWeekly,
			DaysOfWeek: []int{},
		}
		for day := 0; day <= 6; day++ {
			assert.False(t, rt.MatchesDayOfWeek(day))
		}
	})
}

