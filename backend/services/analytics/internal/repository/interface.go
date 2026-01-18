package repository

import (
	"context"

	"github.com/kensan/backend/services/analytics/internal"
)

// Repository defines the interface for analytics data access
type Repository interface {
	// GetTimeEntriesAggregated returns aggregated time entries for a date range
	GetTimeEntriesAggregated(ctx context.Context, userID, startDate, endDate string) ([]TimeEntryAggregate, error)

	// GetTimeBlocksAggregated returns aggregated time blocks (planned time) for a date range
	GetTimeBlocksAggregated(ctx context.Context, userID, startDate, endDate string) (int, error)

	// GetCompletedTasksCount returns the count of tasks completed within a date range
	GetCompletedTasksCount(ctx context.Context, userID, startDate, endDate string) (int, error)

	// GetTotalMinutesByDateRange returns total minutes for a date range
	GetTotalMinutesByDateRange(ctx context.Context, userID, startDate, endDate string) (int, error)

	// GetMinutesByGoalTag returns minutes aggregated by goal tag for a date range
	GetMinutesByGoalTag(ctx context.Context, userID, startDate, endDate string) (map[string]int, error)

	// GetMinutesByGoalTagForCurrentWeek returns minutes for a specific goal tag in the current week
	GetMinutesByGoalTagForCurrentWeek(ctx context.Context, userID string, goalTag analytics.GoalTag) (int, error)

	// GetMinutesByProject returns minutes aggregated by project for a date range
	GetMinutesByProject(ctx context.Context, userID, startDate, endDate string) (map[string]int, error)

	// GetDailyBreakdown returns daily minutes for a date range
	GetDailyBreakdown(ctx context.Context, userID, startDate, endDate string) ([]analytics.DailyBreakdown, error)

	// GetWeeklyBreakdown returns weekly minutes for a date range (for monthly summary)
	GetWeeklyBreakdown(ctx context.Context, userID, startDate, endDate string) ([]analytics.DailyBreakdown, error)
}
