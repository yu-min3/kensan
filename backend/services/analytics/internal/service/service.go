package service

import (
	"context"
	"errors"
	"time"

	"github.com/kensan/backend/services/analytics/internal"
	"github.com/kensan/backend/services/analytics/internal/repository"
)

var (
	ErrInvalidWeekStart = errors.New("invalid week start date")
	ErrInvalidMonth     = errors.New("invalid month")
	ErrInvalidYear      = errors.New("invalid year")
	ErrInvalidPeriod    = errors.New("invalid trend period")
	ErrInvalidCount     = errors.New("invalid count")
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

	// Get minutes by goal (new data model)
	byGoal, err := s.getGoalSummaries(ctx, userID, startDate, endDate)
	if err != nil {
		return nil, err
	}

	// Get minutes by tag
	byTag, err := s.getTagSummaries(ctx, userID, startDate, endDate)
	if err != nil {
		return nil, err
	}

	// Get minutes by milestone
	byMilestone, err := s.getMilestoneSummaries(ctx, userID, startDate, endDate)
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

	return &analytics.WeeklySummary{
		WeekStart:       startDate,
		WeekEnd:         endDate,
		TotalMinutes:    totalMinutes,
		ByGoal:          byGoal,
		ByTag:           byTag,
		ByMilestone:     byMilestone,
		CompletedTasks:  completedTasks,
		PlannedVsActual: analytics.PlannedVsActual{
			Planned: plannedMinutes,
			Actual:  totalMinutes,
		},
	}, nil
}

// getGoalSummaries returns goal summaries for a date range
func (s *Service) getGoalSummaries(ctx context.Context, userID, startDate, endDate string) ([]analytics.GoalSummary, error) {
	goalMinutes, err := s.repo.GetMinutesByGoal(ctx, userID, startDate, endDate)
	if err != nil {
		// Return error instead of silently returning empty slice
		return nil, err
	}

	result := make([]analytics.GoalSummary, 0, len(goalMinutes))
	for _, g := range goalMinutes {
		result = append(result, analytics.GoalSummary{
			ID:      g.ID,
			Name:    g.Name,
			Color:   g.Color,
			Minutes: g.Minutes,
		})
	}
	return result, nil
}

// getTagSummaries returns tag summaries for a date range
func (s *Service) getTagSummaries(ctx context.Context, userID, startDate, endDate string) ([]analytics.TagSummary, error) {
	tagMinutes, err := s.repo.GetMinutesByTag(ctx, userID, startDate, endDate)
	if err != nil {
		// Return error instead of silently returning empty slice
		return nil, err
	}

	result := make([]analytics.TagSummary, 0, len(tagMinutes))
	for _, t := range tagMinutes {
		result = append(result, analytics.TagSummary{
			ID:      t.ID,
			Name:    t.Name,
			Color:   t.Color,
			Minutes: t.Minutes,
		})
	}
	return result, nil
}

// getMilestoneSummaries returns milestone summaries for a date range
func (s *Service) getMilestoneSummaries(ctx context.Context, userID, startDate, endDate string) ([]analytics.MilestoneSummary, error) {
	milestoneMinutes, err := s.repo.GetMinutesByMilestone(ctx, userID, startDate, endDate)
	if err != nil {
		// Return error instead of silently returning empty slice
		return nil, err
	}

	result := make([]analytics.MilestoneSummary, 0, len(milestoneMinutes))
	for _, m := range milestoneMinutes {
		result = append(result, analytics.MilestoneSummary{
			ID:      m.ID,
			Name:    m.Name,
			GoalID:  m.GoalID,
			Minutes: m.Minutes,
		})
	}
	return result, nil
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

	// Get minutes by goal (new data model)
	byGoal, err := s.getGoalSummaries(ctx, userID, startDate, endDate)
	if err != nil {
		return nil, err
	}

	// Get minutes by tag
	byTag, err := s.getTagSummaries(ctx, userID, startDate, endDate)
	if err != nil {
		return nil, err
	}

	// Get minutes by milestone
	byMilestone, err := s.getMilestoneSummaries(ctx, userID, startDate, endDate)
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

	if weeklyBreakdown == nil {
		weeklyBreakdown = []analytics.DailyBreakdown{}
	}

	return &analytics.MonthlySummary{
		Year:            year,
		Month:           month,
		TotalMinutes:    totalMinutes,
		ByGoal:          byGoal,
		ByTag:           byTag,
		ByMilestone:     byMilestone,
		CompletedTasks:  completedTasks,
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

// GetDailyStudyHours returns daily study hours for chart display
func (s *Service) GetDailyStudyHours(ctx context.Context, userID string, filter analytics.DailyStudyHoursFilter) ([]analytics.DailyStudyHour, error) {
	days := filter.Days
	if days <= 0 {
		days = 7
	}
	if days > 30 {
		days = 30
	}

	// Calculate date range (past N days including today)
	now := time.Now()
	endDate := now
	startDate := now.AddDate(0, 0, -(days - 1))

	startDateStr := startDate.Format("2006-01-02")
	endDateStr := endDate.Format("2006-01-02")

	// Get daily breakdown from repository
	dailyBreakdown, err := s.repo.GetDailyBreakdown(ctx, userID, startDateStr, endDateStr)
	if err != nil {
		return nil, err
	}

	// Create a map of existing data
	existing := make(map[string]int)
	for _, db := range dailyBreakdown {
		existing[db.Date] = db.Minutes
	}

	// Japanese weekday names
	weekdayNames := []string{"日", "月", "火", "水", "木", "金", "土"}

	// Build result with all days filled in
	var result []analytics.DailyStudyHour
	for d := startDate; !d.After(endDate); d = d.AddDate(0, 0, 1) {
		dateStr := d.Format("2006-01-02")
		minutes := existing[dateStr]
		result = append(result, analytics.DailyStudyHour{
			Date:  d.Format("1/2"), // M/D format for display
			Hours: float64(minutes) / 60.0,
			Day:   weekdayNames[d.Weekday()],
		})
	}

	return result, nil
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
