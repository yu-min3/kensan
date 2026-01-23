package repository

import (
	"context"

	analytics "github.com/kensan/backend/services/analytics/internal"
)

// Repository defines the interface for analytics data access
type Repository interface {
	// GetTimeBlocksAggregated returns aggregated time blocks (planned time) for a date range
	GetTimeBlocksAggregated(ctx context.Context, userID, startDate, endDate string) (int, error)

	// GetCompletedTasksCount returns the count of tasks completed within a date range
	GetCompletedTasksCount(ctx context.Context, userID, startDate, endDate string) (int, error)

	// GetTotalMinutesByDateRange returns total minutes for a date range
	GetTotalMinutesByDateRange(ctx context.Context, userID, startDate, endDate string) (int, error)

	// GetDailyBreakdown returns daily minutes for a date range
	GetDailyBreakdown(ctx context.Context, userID, startDate, endDate string) ([]analytics.DailyBreakdown, error)

	// GetWeeklyBreakdown returns weekly minutes for a date range (for monthly summary)
	GetWeeklyBreakdown(ctx context.Context, userID, startDate, endDate string) ([]analytics.DailyBreakdown, error)

	// GetMinutesByGoal returns minutes aggregated by goal for a date range
	GetMinutesByGoal(ctx context.Context, userID, startDate, endDate string) ([]GoalWithMinutes, error)

	// GetMinutesByMilestone returns minutes aggregated by milestone for a date range
	GetMinutesByMilestone(ctx context.Context, userID, startDate, endDate string) ([]MilestoneWithMinutes, error)

	// GetMinutesByTag returns minutes aggregated by tag for a date range
	GetMinutesByTag(ctx context.Context, userID, startDate, endDate string) ([]TagWithMinutes, error)

	// GetGoals returns all goals for a user
	GetGoals(ctx context.Context, userID string) ([]analytics.GoalSummary, error)
}
