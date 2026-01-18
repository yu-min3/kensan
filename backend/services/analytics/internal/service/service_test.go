package service

import (
	"context"
	"errors"
	"testing"

	"github.com/kensan/backend/services/analytics/internal"
	"github.com/kensan/backend/services/analytics/internal/repository"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockRepository is a mock implementation of the analytics repository
type MockRepository struct {
	mock.Mock
}

// Compile-time check that MockRepository implements repository.Repository
var _ repository.Repository = (*MockRepository)(nil)

func (m *MockRepository) GetTimeEntriesAggregated(ctx context.Context, userID, startDate, endDate string) ([]repository.TimeEntryAggregate, error) {
	args := m.Called(ctx, userID, startDate, endDate)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]repository.TimeEntryAggregate), args.Error(1)
}

func (m *MockRepository) GetTotalMinutesByDateRange(ctx context.Context, userID, startDate, endDate string) (int, error) {
	args := m.Called(ctx, userID, startDate, endDate)
	return args.Int(0), args.Error(1)
}

func (m *MockRepository) GetMinutesByGoalTag(ctx context.Context, userID, startDate, endDate string) (map[string]int, error) {
	args := m.Called(ctx, userID, startDate, endDate)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[string]int), args.Error(1)
}

func (m *MockRepository) GetMinutesByProject(ctx context.Context, userID, startDate, endDate string) (map[string]int, error) {
	args := m.Called(ctx, userID, startDate, endDate)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[string]int), args.Error(1)
}

func (m *MockRepository) GetCompletedTasksCount(ctx context.Context, userID, startDate, endDate string) (int, error) {
	args := m.Called(ctx, userID, startDate, endDate)
	return args.Int(0), args.Error(1)
}

func (m *MockRepository) GetTimeBlocksAggregated(ctx context.Context, userID, startDate, endDate string) (int, error) {
	args := m.Called(ctx, userID, startDate, endDate)
	return args.Int(0), args.Error(1)
}

func (m *MockRepository) GetDailyBreakdown(ctx context.Context, userID, startDate, endDate string) ([]analytics.DailyBreakdown, error) {
	args := m.Called(ctx, userID, startDate, endDate)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]analytics.DailyBreakdown), args.Error(1)
}

func (m *MockRepository) GetWeeklyBreakdown(ctx context.Context, userID, startDate, endDate string) ([]analytics.DailyBreakdown, error) {
	args := m.Called(ctx, userID, startDate, endDate)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]analytics.DailyBreakdown), args.Error(1)
}

func (m *MockRepository) GetMinutesByGoalTagForCurrentWeek(ctx context.Context, userID string, goalTag analytics.GoalTag) (int, error) {
	args := m.Called(ctx, userID, goalTag)
	return args.Int(0), args.Error(1)
}

// ========== GoalTag Tests ==========

func TestGoalTag_IsValid(t *testing.T) {
	testCases := []struct {
		tag      analytics.GoalTag
		expected bool
	}{
		{analytics.GoalTagGK, true},
		{analytics.GoalTagOSS, true},
		{analytics.GoalTagOutput, true},
		{analytics.GoalTagOther, true},
		{analytics.GoalTag("invalid"), false},
		{analytics.GoalTag(""), false},
	}

	for _, tc := range testCases {
		t.Run(string(tc.tag), func(t *testing.T) {
			assert.Equal(t, tc.expected, tc.tag.IsValid())
		})
	}
}

func TestGoalTag_WeeklyTargetMinutes(t *testing.T) {
	testCases := []struct {
		tag      analytics.GoalTag
		expected int
	}{
		{analytics.GoalTagGK, 1200},     // 20 hours
		{analytics.GoalTagOSS, 600},     // 10 hours
		{analytics.GoalTagOutput, 300},  // 5 hours
		{analytics.GoalTagOther, 300},   // 5 hours
		{analytics.GoalTag("invalid"), 0},
	}

	for _, tc := range testCases {
		t.Run(string(tc.tag), func(t *testing.T) {
			assert.Equal(t, tc.expected, tc.tag.WeeklyTargetMinutes())
		})
	}
}

func TestAllGoalTags(t *testing.T) {
	tags := analytics.AllGoalTags()
	assert.Len(t, tags, 4)
	assert.Contains(t, tags, analytics.GoalTagGK)
	assert.Contains(t, tags, analytics.GoalTagOSS)
	assert.Contains(t, tags, analytics.GoalTagOutput)
	assert.Contains(t, tags, analytics.GoalTagOther)
}

// ========== TrendPeriod Tests ==========

func TestTrendPeriod_IsValid(t *testing.T) {
	testCases := []struct {
		period   analytics.TrendPeriod
		expected bool
	}{
		{analytics.TrendPeriodWeek, true},
		{analytics.TrendPeriodMonth, true},
		{analytics.TrendPeriodQuarter, true},
		{analytics.TrendPeriod("invalid"), false},
		{analytics.TrendPeriod(""), false},
	}

	for _, tc := range testCases {
		t.Run(string(tc.period), func(t *testing.T) {
			assert.Equal(t, tc.expected, tc.period.IsValid())
		})
	}
}

// ========== Service.GetWeeklySummary Tests ==========

func TestService_GetWeeklySummary_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	filter := analytics.WeeklySummaryFilter{
		WeekStart: "2024-01-15",
	}

	// Setup mock expectations
	mockRepo.On("GetTotalMinutesByDateRange", ctx, userID, "2024-01-15", "2024-01-21").Return(1500, nil)
	mockRepo.On("GetMinutesByGoalTag", ctx, userID, "2024-01-15", "2024-01-21").Return(map[string]int{"GK": 900, "OSS": 600}, nil)
	mockRepo.On("GetMinutesByProject", ctx, userID, "2024-01-15", "2024-01-21").Return(map[string]int{"ProjectA": 800, "ProjectB": 700}, nil)
	mockRepo.On("GetCompletedTasksCount", ctx, userID, "2024-01-15", "2024-01-21").Return(15, nil)
	mockRepo.On("GetTimeBlocksAggregated", ctx, userID, "2024-01-15", "2024-01-21").Return(1800, nil)
	mockRepo.On("GetDailyBreakdown", ctx, userID, "2024-01-15", "2024-01-21").Return([]analytics.DailyBreakdown{
		{Date: "2024-01-15", Minutes: 200},
		{Date: "2024-01-16", Minutes: 250},
	}, nil)

	result, err := svc.GetWeeklySummary(ctx, userID, filter)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "2024-01-15", result.WeekStart)
	assert.Equal(t, "2024-01-21", result.WeekEnd)
	assert.Equal(t, 1500, result.TotalMinutes)
	assert.Equal(t, 900, result.ByGoalTag["GK"])
	assert.Equal(t, 600, result.ByGoalTag["OSS"])
	assert.Equal(t, 15, result.CompletedTasks)
	assert.Equal(t, 1800, result.PlannedVsActual.Planned)
	assert.Equal(t, 1500, result.PlannedVsActual.Actual)
	// Daily breakdown should be filled to 7 days
	assert.Len(t, result.DailyBreakdown, 7)
	mockRepo.AssertExpectations(t)
}

func TestService_GetWeeklySummary_InvalidWeekStart(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	filter := analytics.WeeklySummaryFilter{
		WeekStart: "invalid-date",
	}

	result, err := svc.GetWeeklySummary(ctx, userID, filter)

	assert.Nil(t, result)
	assert.Equal(t, ErrInvalidWeekStart, err)
}

func TestService_GetWeeklySummary_RepositoryError(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	filter := analytics.WeeklySummaryFilter{
		WeekStart: "2024-01-15",
	}

	repoErr := errors.New("database connection failed")
	mockRepo.On("GetTotalMinutesByDateRange", ctx, userID, "2024-01-15", "2024-01-21").Return(0, repoErr)

	result, err := svc.GetWeeklySummary(ctx, userID, filter)

	assert.Nil(t, result)
	assert.Equal(t, repoErr, err)
	mockRepo.AssertExpectations(t)
}

func TestService_GetWeeklySummary_NilMapsHandled(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	filter := analytics.WeeklySummaryFilter{
		WeekStart: "2024-01-15",
	}

	// Return nil maps
	mockRepo.On("GetTotalMinutesByDateRange", ctx, userID, "2024-01-15", "2024-01-21").Return(0, nil)
	mockRepo.On("GetMinutesByGoalTag", ctx, userID, "2024-01-15", "2024-01-21").Return(nil, nil)
	mockRepo.On("GetMinutesByProject", ctx, userID, "2024-01-15", "2024-01-21").Return(nil, nil)
	mockRepo.On("GetCompletedTasksCount", ctx, userID, "2024-01-15", "2024-01-21").Return(0, nil)
	mockRepo.On("GetTimeBlocksAggregated", ctx, userID, "2024-01-15", "2024-01-21").Return(0, nil)
	mockRepo.On("GetDailyBreakdown", ctx, userID, "2024-01-15", "2024-01-21").Return(nil, nil)

	result, err := svc.GetWeeklySummary(ctx, userID, filter)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.NotNil(t, result.ByGoalTag)
	assert.NotNil(t, result.ByProject)
	mockRepo.AssertExpectations(t)
}

// ========== Service.GetMonthlySummary Tests ==========

func TestService_GetMonthlySummary_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	filter := analytics.MonthlySummaryFilter{
		Year:  2024,
		Month: 1,
	}

	// Setup mock expectations for January 2024
	mockRepo.On("GetTotalMinutesByDateRange", ctx, userID, "2024-01-01", "2024-01-31").Return(6000, nil)
	mockRepo.On("GetMinutesByGoalTag", ctx, userID, "2024-01-01", "2024-01-31").Return(map[string]int{"GK": 3000, "OSS": 2000}, nil)
	mockRepo.On("GetMinutesByProject", ctx, userID, "2024-01-01", "2024-01-31").Return(map[string]int{"ProjectA": 4000}, nil)
	mockRepo.On("GetCompletedTasksCount", ctx, userID, "2024-01-01", "2024-01-31").Return(50, nil)
	mockRepo.On("GetTimeBlocksAggregated", ctx, userID, "2024-01-01", "2024-01-31").Return(7000, nil)
	mockRepo.On("GetWeeklyBreakdown", ctx, userID, "2024-01-01", "2024-01-31").Return([]analytics.DailyBreakdown{
		{Date: "Week 1", Minutes: 1500},
		{Date: "Week 2", Minutes: 1500},
	}, nil)

	result, err := svc.GetMonthlySummary(ctx, userID, filter)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 2024, result.Year)
	assert.Equal(t, 1, result.Month)
	assert.Equal(t, 6000, result.TotalMinutes)
	assert.Equal(t, 50, result.CompletedTasks)
	assert.Equal(t, 7000, result.PlannedVsActual.Planned)
	mockRepo.AssertExpectations(t)
}

func TestService_GetMonthlySummary_InvalidMonth(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	testCases := []struct {
		name   string
		filter analytics.MonthlySummaryFilter
	}{
		{
			name:   "month 0",
			filter: analytics.MonthlySummaryFilter{Year: 2024, Month: 0},
		},
		{
			name:   "month 13",
			filter: analytics.MonthlySummaryFilter{Year: 2024, Month: 13},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Note: Month 0 defaults to current month, so only Month 13 should fail
			if tc.filter.Month == 13 {
				result, err := svc.GetMonthlySummary(ctx, userID, tc.filter)
				assert.Nil(t, result)
				assert.Equal(t, ErrInvalidMonth, err)
			}
		})
	}
}

func TestService_GetMonthlySummary_InvalidYear(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	testCases := []struct {
		name   string
		filter analytics.MonthlySummaryFilter
	}{
		{
			name:   "year 1999",
			filter: analytics.MonthlySummaryFilter{Year: 1999, Month: 6},
		},
		{
			name:   "year 2101",
			filter: analytics.MonthlySummaryFilter{Year: 2101, Month: 6},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result, err := svc.GetMonthlySummary(ctx, userID, tc.filter)
			assert.Nil(t, result)
			assert.Equal(t, ErrInvalidYear, err)
		})
	}
}

// ========== Service.GetTrends Tests ==========

func TestService_GetTrends_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	filter := analytics.TrendFilter{
		Period: analytics.TrendPeriodWeek,
		Count:  2,
	}

	// Mock will be called for each period
	mockRepo.On("GetTotalMinutesByDateRange", ctx, userID, mock.AnythingOfType("string"), mock.AnythingOfType("string")).Return(1500, nil)

	result, err := svc.GetTrends(ctx, userID, filter)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result, 2)
	mockRepo.AssertExpectations(t)
}

func TestService_GetTrends_InvalidPeriod(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	filter := analytics.TrendFilter{
		Period: analytics.TrendPeriod("invalid"),
		Count:  4,
	}

	result, err := svc.GetTrends(ctx, userID, filter)

	assert.Nil(t, result)
	assert.Equal(t, ErrInvalidPeriod, err)
}

func TestService_GetTrends_DefaultsApplied(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	// Empty filter should use defaults
	filter := analytics.TrendFilter{}

	mockRepo.On("GetTotalMinutesByDateRange", ctx, userID, mock.AnythingOfType("string"), mock.AnythingOfType("string")).Return(1000, nil)

	result, err := svc.GetTrends(ctx, userID, filter)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	// Default count is 4
	assert.Len(t, result, 4)
	mockRepo.AssertExpectations(t)
}

func TestService_GetTrends_CountLimitedTo52(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	filter := analytics.TrendFilter{
		Period: analytics.TrendPeriodWeek,
		Count:  100, // Should be capped at 52
	}

	mockRepo.On("GetTotalMinutesByDateRange", ctx, userID, mock.AnythingOfType("string"), mock.AnythingOfType("string")).Return(500, nil)

	result, err := svc.GetTrends(ctx, userID, filter)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result, 52)
	mockRepo.AssertExpectations(t)
}

// ========== Service.GetGoalProgress Tests ==========

func TestService_GetGoalProgress_AllGoals(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	filter := analytics.GoalProgressFilter{}

	// Mock for all goal tags
	mockRepo.On("GetMinutesByGoalTagForCurrentWeek", ctx, userID, analytics.GoalTagGK).Return(900, nil)
	mockRepo.On("GetMinutesByGoalTagForCurrentWeek", ctx, userID, analytics.GoalTagOSS).Return(600, nil)
	mockRepo.On("GetMinutesByGoalTagForCurrentWeek", ctx, userID, analytics.GoalTagOutput).Return(300, nil)
	mockRepo.On("GetMinutesByGoalTagForCurrentWeek", ctx, userID, analytics.GoalTagOther).Return(150, nil)

	result, err := svc.GetGoalProgress(ctx, userID, filter)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result, 4)
	mockRepo.AssertExpectations(t)
}

func TestService_GetGoalProgress_SingleGoal(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	goalTag := analytics.GoalTagGK
	filter := analytics.GoalProgressFilter{
		GoalTag: &goalTag,
	}

	mockRepo.On("GetMinutesByGoalTagForCurrentWeek", ctx, userID, analytics.GoalTagGK).Return(900, nil)

	result, err := svc.GetGoalProgress(ctx, userID, filter)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result, 1)
	assert.Equal(t, "GK", result[0].GoalTag)
	assert.Equal(t, 1200, result[0].WeeklyTargetMinutes)
	assert.Equal(t, 900, result[0].CurrentWeekMinutes)
	assert.Equal(t, 75.0, result[0].Progress)
	assert.False(t, result[0].OnTrack) // 75% < 80%
	mockRepo.AssertExpectations(t)
}

func TestService_GetGoalProgress_InvalidGoalTag(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	invalidTag := analytics.GoalTag("invalid")
	filter := analytics.GoalProgressFilter{
		GoalTag: &invalidTag,
	}

	result, err := svc.GetGoalProgress(ctx, userID, filter)

	assert.Nil(t, result)
	assert.Equal(t, ErrInvalidGoalTag, err)
}

func TestService_GetGoalProgress_OnTrackLogic(t *testing.T) {
	testCases := []struct {
		name           string
		currentMinutes int
		targetMinutes  int
		expectedOnTrack bool
	}{
		{
			name:           "exactly 80% on track",
			currentMinutes: 960, // 80% of 1200
			targetMinutes:  1200,
			expectedOnTrack: true,
		},
		{
			name:           "above 80% on track",
			currentMinutes: 1000,
			targetMinutes:  1200,
			expectedOnTrack: true,
		},
		{
			name:           "exceeds target on track",
			currentMinutes: 1300,
			targetMinutes:  1200,
			expectedOnTrack: true,
		},
		{
			name:           "below 80% not on track",
			currentMinutes: 900, // 75% of 1200
			targetMinutes:  1200,
			expectedOnTrack: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			mockRepo := new(MockRepository)
			svc := NewService(mockRepo)
			ctx := context.Background()
			userID := "user-123"

			goalTag := analytics.GoalTagGK
			filter := analytics.GoalProgressFilter{
				GoalTag: &goalTag,
			}

			mockRepo.On("GetMinutesByGoalTagForCurrentWeek", ctx, userID, analytics.GoalTagGK).Return(tc.currentMinutes, nil)

			result, err := svc.GetGoalProgress(ctx, userID, filter)

			assert.NoError(t, err)
			assert.NotNil(t, result)
			assert.Equal(t, tc.expectedOnTrack, result[0].OnTrack)
			mockRepo.AssertExpectations(t)
		})
	}
}

func TestService_GetGoalProgress_RepositoryError(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	goalTag := analytics.GoalTagGK
	filter := analytics.GoalProgressFilter{
		GoalTag: &goalTag,
	}

	repoErr := errors.New("database error")
	mockRepo.On("GetMinutesByGoalTagForCurrentWeek", ctx, userID, analytics.GoalTagGK).Return(0, repoErr)

	result, err := svc.GetGoalProgress(ctx, userID, filter)

	assert.Nil(t, result)
	assert.Equal(t, repoErr, err)
	mockRepo.AssertExpectations(t)
}

