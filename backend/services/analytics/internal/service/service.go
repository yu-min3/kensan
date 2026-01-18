package service

import (
	"context"
	"errors"
	"time"

	"github.com/kensan/backend/services/analytics/internal"
	"github.com/kensan/backend/services/analytics/internal/repository"
)

var (
	ErrInvalidWeekStart  = errors.New("invalid week start date")
	ErrInvalidMonth      = errors.New("invalid month")
	ErrInvalidYear       = errors.New("invalid year")
	ErrInvalidPeriod     = errors.New("invalid trend period")
	ErrInvalidCount      = errors.New("invalid count")
	ErrInvalidGoalTag    = errors.New("invalid goal tag")
)

// Service handles business logic for analytics
type Service struct {
	repo repository.Repository
}

// NewService creates a new analytics service
func NewService(repo repository.Repository) *Service {
	return &Service{repo: repo}
}

// GetWeeklySummary returns a weekly summary for a given week
func (s *Service) GetWeeklySummary(ctx context.Context, userID string, filter analytics.WeeklySummaryFilter) (*analytics.WeeklySummary, error) {
	var weekStart time.Time
	var err error

	if filter.WeekStart != "" {
		weekStart, err = time.Parse("2006-01-02", filter.WeekStart)
		if err != nil {
			return nil, ErrInvalidWeekStart
		}
	} else {
		// Default to current week's Monday
		now := time.Now()
		weekday := int(now.Weekday())
		if weekday == 0 {
			weekday = 7 // Sunday
		}
		mondayOffset := weekday - 1
		weekStart = now.AddDate(0, 0, -mondayOffset)
	}

	// Normalize to start of day
	weekStart = time.Date(weekStart.Year(), weekStart.Month(), weekStart.Day(), 0, 0, 0, 0, time.Local)
	weekEnd := weekStart.AddDate(0, 0, 6)

	startDate := weekStart.Format("2006-01-02")
	endDate := weekEnd.Format("2006-01-02")

	// Get total minutes
	totalMinutes, err := s.repo.GetTotalMinutesByDateRange(ctx, userID, startDate, endDate)
	if err != nil {
		return nil, err
	}

	// Get minutes by goal tag
	byGoalTag, err := s.repo.GetMinutesByGoalTag(ctx, userID, startDate, endDate)
	if err != nil {
		return nil, err
	}

	// Get minutes by project
	byProject, err := s.repo.GetMinutesByProject(ctx, userID, startDate, endDate)
	if err != nil {
		return nil, err
	}

	// Get completed tasks count
	completedTasks, err := s.repo.GetCompletedTasksCount(ctx, userID, startDate, endDate)
	if err != nil {
		return nil, err
	}

	// Get planned vs actual
	plannedMinutes, err := s.repo.GetTimeBlocksAggregated(ctx, userID, startDate, endDate)
	if err != nil {
		return nil, err
	}

	// Get daily breakdown
	dailyBreakdown, err := s.repo.GetDailyBreakdown(ctx, userID, startDate, endDate)
	if err != nil {
		return nil, err
	}

	// Fill in missing days with 0 minutes
	dailyBreakdown = s.fillDailyBreakdown(weekStart, weekEnd, dailyBreakdown)

	// Ensure maps are not nil
	if byGoalTag == nil {
		byGoalTag = make(map[string]int)
	}
	if byProject == nil {
		byProject = make(map[string]int)
	}

	return &analytics.WeeklySummary{
		WeekStart:      startDate,
		WeekEnd:        endDate,
		TotalMinutes:   totalMinutes,
		ByGoalTag:      byGoalTag,
		ByProject:      byProject,
		CompletedTasks: completedTasks,
		PlannedVsActual: analytics.PlannedVsActual{
			Planned: plannedMinutes,
			Actual:  totalMinutes,
		},
		DailyBreakdown: dailyBreakdown,
	}, nil
}

// GetMonthlySummary returns a monthly summary for a given month
func (s *Service) GetMonthlySummary(ctx context.Context, userID string, filter analytics.MonthlySummaryFilter) (*analytics.MonthlySummary, error) {
	year := filter.Year
	month := filter.Month

	// Default to current month if not specified
	if year == 0 {
		year = time.Now().Year()
	}
	if month == 0 {
		month = int(time.Now().Month())
	}

	// Validate
	if month < 1 || month > 12 {
		return nil, ErrInvalidMonth
	}
	if year < 2000 || year > 2100 {
		return nil, ErrInvalidYear
	}

	// Calculate date range
	monthStart := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.Local)
	monthEnd := monthStart.AddDate(0, 1, -1) // Last day of month

	startDate := monthStart.Format("2006-01-02")
	endDate := monthEnd.Format("2006-01-02")

	// Get total minutes
	totalMinutes, err := s.repo.GetTotalMinutesByDateRange(ctx, userID, startDate, endDate)
	if err != nil {
		return nil, err
	}

	// Get minutes by goal tag
	byGoalTag, err := s.repo.GetMinutesByGoalTag(ctx, userID, startDate, endDate)
	if err != nil {
		return nil, err
	}

	// Get minutes by project
	byProject, err := s.repo.GetMinutesByProject(ctx, userID, startDate, endDate)
	if err != nil {
		return nil, err
	}

	// Get completed tasks count
	completedTasks, err := s.repo.GetCompletedTasksCount(ctx, userID, startDate, endDate)
	if err != nil {
		return nil, err
	}

	// Get planned vs actual
	plannedMinutes, err := s.repo.GetTimeBlocksAggregated(ctx, userID, startDate, endDate)
	if err != nil {
		return nil, err
	}

	// Get weekly breakdown
	weeklyBreakdown, err := s.repo.GetWeeklyBreakdown(ctx, userID, startDate, endDate)
	if err != nil {
		return nil, err
	}

	// Ensure maps are not nil
	if byGoalTag == nil {
		byGoalTag = make(map[string]int)
	}
	if byProject == nil {
		byProject = make(map[string]int)
	}
	if weeklyBreakdown == nil {
		weeklyBreakdown = []analytics.DailyBreakdown{}
	}

	return &analytics.MonthlySummary{
		Year:           year,
		Month:          month,
		TotalMinutes:   totalMinutes,
		ByGoalTag:      byGoalTag,
		ByProject:      byProject,
		CompletedTasks: completedTasks,
		PlannedVsActual: analytics.PlannedVsActual{
			Planned: plannedMinutes,
			Actual:  totalMinutes,
		},
		WeeklyBreakdown: weeklyBreakdown,
	}, nil
}

// GetTrends returns trend data points for analysis
func (s *Service) GetTrends(ctx context.Context, userID string, filter analytics.TrendFilter) ([]analytics.TrendDataPoint, error) {
	period := filter.Period
	count := filter.Count

	// Validate and set defaults
	if period == "" {
		period = analytics.TrendPeriodWeek
	}
	if !period.IsValid() {
		return nil, ErrInvalidPeriod
	}
	if count <= 0 {
		count = 4 // Default to 4 periods
	}
	if count > 52 {
		count = 52 // Max 52 periods
	}

	var dataPoints []analytics.TrendDataPoint
	now := time.Now()

	for i := count - 1; i >= 0; i-- {
		var startDate, endDate time.Time

		switch period {
		case analytics.TrendPeriodWeek:
			// Get the start of the current week (Monday)
			weekday := int(now.Weekday())
			if weekday == 0 {
				weekday = 7
			}
			currentWeekStart := now.AddDate(0, 0, -(weekday - 1))
			startDate = currentWeekStart.AddDate(0, 0, -7*i)
			endDate = startDate.AddDate(0, 0, 6)

		case analytics.TrendPeriodMonth:
			// Get the start of the month, i months ago
			startDate = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.Local).AddDate(0, -i, 0)
			endDate = startDate.AddDate(0, 1, -1)

		case analytics.TrendPeriodQuarter:
			// Get the start of the quarter, i quarters ago
			currentQuarter := (int(now.Month()) - 1) / 3
			quarterStart := time.Date(now.Year(), time.Month(currentQuarter*3+1), 1, 0, 0, 0, 0, time.Local)
			startDate = quarterStart.AddDate(0, -3*i, 0)
			endDate = startDate.AddDate(0, 3, -1)
		}

		startDateStr := startDate.Format("2006-01-02")
		endDateStr := endDate.Format("2006-01-02")

		totalMinutes, err := s.repo.GetTotalMinutesByDateRange(ctx, userID, startDateStr, endDateStr)
		if err != nil {
			return nil, err
		}

		dataPoints = append(dataPoints, analytics.TrendDataPoint{
			StartDate:    startDateStr,
			EndDate:      endDateStr,
			TotalMinutes: totalMinutes,
		})
	}

	return dataPoints, nil
}

// GetGoalProgress returns progress for goals
func (s *Service) GetGoalProgress(ctx context.Context, userID string, filter analytics.GoalProgressFilter) ([]analytics.GoalProgress, error) {
	var goalTags []analytics.GoalTag

	if filter.GoalTag != nil {
		if !filter.GoalTag.IsValid() {
			return nil, ErrInvalidGoalTag
		}
		goalTags = []analytics.GoalTag{*filter.GoalTag}
	} else {
		goalTags = analytics.AllGoalTags()
	}

	var progressList []analytics.GoalProgress

	for _, gt := range goalTags {
		currentWeekMinutes, err := s.repo.GetMinutesByGoalTagForCurrentWeek(ctx, userID, gt)
		if err != nil {
			return nil, err
		}

		weeklyTarget := gt.WeeklyTargetMinutes()
		var progress float64
		if weeklyTarget > 0 {
			progress = float64(currentWeekMinutes) / float64(weeklyTarget) * 100
		}

		// On track if progress >= expected based on day of week
		// For simplicity, we check if they're at least 80% of target
		onTrack := progress >= 80 || currentWeekMinutes >= weeklyTarget

		progressList = append(progressList, analytics.GoalProgress{
			GoalTag:             string(gt),
			WeeklyTargetMinutes: weeklyTarget,
			CurrentWeekMinutes:  currentWeekMinutes,
			Progress:            progress,
			OnTrack:             onTrack,
		})
	}

	return progressList, nil
}

// fillDailyBreakdown fills in missing days with 0 minutes
func (s *Service) fillDailyBreakdown(start, end time.Time, breakdown []analytics.DailyBreakdown) []analytics.DailyBreakdown {
	// Create a map of existing data
	existing := make(map[string]int)
	for _, db := range breakdown {
		existing[db.Date] = db.Minutes
	}

	// Create complete list
	var result []analytics.DailyBreakdown
	for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
		dateStr := d.Format("2006-01-02")
		minutes := existing[dateStr] // Will be 0 if not found
		result = append(result, analytics.DailyBreakdown{
			Date:    dateStr,
			Minutes: minutes,
		})
	}

	return result
}
