package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kensan/backend/services/analytics/internal"
)

// Compile-time check that PostgresRepository implements Repository
var _ Repository = (*PostgresRepository)(nil)

// PostgresRepository handles database operations for analytics
type PostgresRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresRepository creates a new analytics repository
func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

// TimeEntryAggregate represents aggregated time entry data
type TimeEntryAggregate struct {
	Date      string
	GoalTag   *string
	ProjectID *string
	Minutes   int
}

// GetTimeEntriesAggregated returns aggregated time entries for a date range
// Uses cascade logic: time_entry.goal_tag > task.goal_tag > project.goal_tag
func (r *PostgresRepository) GetTimeEntriesAggregated(ctx context.Context, userID, startDate, endDate string) ([]TimeEntryAggregate, error) {
	query := `
		SELECT
			te.date::text,
			COALESCE(te.goal_tag, t.goal_tag, p.goal_tag) AS effective_goal_tag,
			te.project_id::text,
			SUM(
				EXTRACT(EPOCH FROM (
					(te.date || ' ' || te.end_time)::timestamp -
					(te.date || ' ' || te.start_time)::timestamp
				)) / 60
			)::integer AS minutes
		FROM time_entries te
		LEFT JOIN tasks t ON te.task_id = t.id
		LEFT JOIN projects p ON te.project_id = p.id
		WHERE te.user_id = $1 AND te.date >= $2 AND te.date <= $3
		GROUP BY te.date, COALESCE(te.goal_tag, t.goal_tag, p.goal_tag), te.project_id
		ORDER BY te.date ASC
	`

	rows, err := r.pool.Query(ctx, query, userID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to query time entries: %w", err)
	}
	defer rows.Close()

	var aggregates []TimeEntryAggregate
	for rows.Next() {
		var agg TimeEntryAggregate
		err := rows.Scan(&agg.Date, &agg.GoalTag, &agg.ProjectID, &agg.Minutes)
		if err != nil {
			return nil, fmt.Errorf("failed to scan time entry aggregate: %w", err)
		}
		aggregates = append(aggregates, agg)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating time entries: %w", err)
	}

	return aggregates, nil
}

// GetTimeBlocksAggregated returns aggregated time blocks (planned time) for a date range
func (r *PostgresRepository) GetTimeBlocksAggregated(ctx context.Context, userID, startDate, endDate string) (int, error) {
	query := `
		SELECT COALESCE(SUM(
			EXTRACT(EPOCH FROM (
				(date || ' ' || end_time)::timestamp -
				(date || ' ' || start_time)::timestamp
			)) / 60
		)::integer, 0) AS total_minutes
		FROM time_blocks
		WHERE user_id = $1 AND date >= $2 AND date <= $3
	`

	var totalMinutes int
	err := r.pool.QueryRow(ctx, query, userID, startDate, endDate).Scan(&totalMinutes)
	if err != nil {
		return 0, fmt.Errorf("failed to query time blocks: %w", err)
	}

	return totalMinutes, nil
}

// GetCompletedTasksCount returns the count of tasks completed within a date range
func (r *PostgresRepository) GetCompletedTasksCount(ctx context.Context, userID, startDate, endDate string) (int, error) {
	// Tasks table has updated_at column, so we check tasks that are completed
	// and were updated within the date range
	query := `
		SELECT COUNT(*)
		FROM tasks
		WHERE user_id = $1
			AND completed = true
			AND updated_at >= $2::date
			AND updated_at < ($3::date + INTERVAL '1 day')
	`

	var count int
	err := r.pool.QueryRow(ctx, query, userID, startDate, endDate).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count completed tasks: %w", err)
	}

	return count, nil
}

// GetTotalMinutesByDateRange returns total minutes for a date range
func (r *PostgresRepository) GetTotalMinutesByDateRange(ctx context.Context, userID, startDate, endDate string) (int, error) {
	query := `
		SELECT COALESCE(SUM(
			EXTRACT(EPOCH FROM (
				(date || ' ' || end_time)::timestamp -
				(date || ' ' || start_time)::timestamp
			)) / 60
		)::integer, 0) AS total_minutes
		FROM time_entries
		WHERE user_id = $1 AND date >= $2 AND date <= $3
	`

	var totalMinutes int
	err := r.pool.QueryRow(ctx, query, userID, startDate, endDate).Scan(&totalMinutes)
	if err != nil {
		return 0, fmt.Errorf("failed to get total minutes: %w", err)
	}

	return totalMinutes, nil
}

// GetMinutesByGoalTag returns minutes aggregated by goal tag for a date range
// Uses cascade logic: time_entry.goal_tag > task.goal_tag > project.goal_tag
func (r *PostgresRepository) GetMinutesByGoalTag(ctx context.Context, userID, startDate, endDate string) (map[string]int, error) {
	query := `
		SELECT
			COALESCE(te.goal_tag, t.goal_tag, p.goal_tag, 'Other') as effective_goal_tag,
			SUM(
				EXTRACT(EPOCH FROM (
					(te.date || ' ' || te.end_time)::timestamp -
					(te.date || ' ' || te.start_time)::timestamp
				)) / 60
			)::integer AS minutes
		FROM time_entries te
		LEFT JOIN tasks t ON te.task_id = t.id
		LEFT JOIN projects p ON te.project_id = p.id
		WHERE te.user_id = $1 AND te.date >= $2 AND te.date <= $3
		GROUP BY COALESCE(te.goal_tag, t.goal_tag, p.goal_tag, 'Other')
	`

	rows, err := r.pool.Query(ctx, query, userID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to query minutes by goal tag: %w", err)
	}
	defer rows.Close()

	result := make(map[string]int)
	for rows.Next() {
		var goalTag string
		var minutes int
		if err := rows.Scan(&goalTag, &minutes); err != nil {
			return nil, fmt.Errorf("failed to scan goal tag minutes: %w", err)
		}
		result[goalTag] = minutes
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating goal tag minutes: %w", err)
	}

	return result, nil
}

// GetMinutesByGoalTagForCurrentWeek returns minutes for a specific goal tag in the current week
// Uses cascade logic: time_entry.goal_tag > task.goal_tag > project.goal_tag
func (r *PostgresRepository) GetMinutesByGoalTagForCurrentWeek(ctx context.Context, userID string, goalTag analytics.GoalTag) (int, error) {
	// Get current week start (Monday) and end (Sunday)
	now := time.Now()
	weekday := int(now.Weekday())
	if weekday == 0 {
		weekday = 7 // Sunday
	}
	mondayOffset := weekday - 1
	weekStart := now.AddDate(0, 0, -mondayOffset)
	weekEnd := weekStart.AddDate(0, 0, 6)

	startDate := weekStart.Format("2006-01-02")
	endDate := weekEnd.Format("2006-01-02")

	query := `
		SELECT COALESCE(SUM(
			EXTRACT(EPOCH FROM (
				(te.date || ' ' || te.end_time)::timestamp -
				(te.date || ' ' || te.start_time)::timestamp
			)) / 60
		)::integer, 0) AS minutes
		FROM time_entries te
		LEFT JOIN tasks t ON te.task_id = t.id
		LEFT JOIN projects p ON te.project_id = p.id
		WHERE te.user_id = $1 AND te.date >= $2 AND te.date <= $3
			AND COALESCE(te.goal_tag, t.goal_tag, p.goal_tag) = $4
	`

	var minutes int
	err := r.pool.QueryRow(ctx, query, userID, startDate, endDate, string(goalTag)).Scan(&minutes)
	if err != nil {
		return 0, fmt.Errorf("failed to get minutes for goal tag: %w", err)
	}

	return minutes, nil
}

// GetMinutesByProject returns minutes aggregated by project for a date range
func (r *PostgresRepository) GetMinutesByProject(ctx context.Context, userID, startDate, endDate string) (map[string]int, error) {
	query := `
		SELECT
			COALESCE(project_id::text, 'unknown') as project_id,
			SUM(
				EXTRACT(EPOCH FROM (
					(date || ' ' || end_time)::timestamp -
					(date || ' ' || start_time)::timestamp
				)) / 60
			)::integer AS minutes
		FROM time_entries
		WHERE user_id = $1 AND date >= $2 AND date <= $3
		GROUP BY project_id
	`

	rows, err := r.pool.Query(ctx, query, userID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to query minutes by project: %w", err)
	}
	defer rows.Close()

	result := make(map[string]int)
	for rows.Next() {
		var projectID string
		var minutes int
		if err := rows.Scan(&projectID, &minutes); err != nil {
			return nil, fmt.Errorf("failed to scan project minutes: %w", err)
		}
		result[projectID] = minutes
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating project minutes: %w", err)
	}

	return result, nil
}

// GetDailyBreakdown returns daily minutes for a date range
func (r *PostgresRepository) GetDailyBreakdown(ctx context.Context, userID, startDate, endDate string) ([]analytics.DailyBreakdown, error) {
	query := `
		SELECT
			date::text,
			SUM(
				EXTRACT(EPOCH FROM (
					(date || ' ' || end_time)::timestamp -
					(date || ' ' || start_time)::timestamp
				)) / 60
			)::integer AS minutes
		FROM time_entries
		WHERE user_id = $1 AND date >= $2 AND date <= $3
		GROUP BY date
		ORDER BY date ASC
	`

	rows, err := r.pool.Query(ctx, query, userID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to query daily breakdown: %w", err)
	}
	defer rows.Close()

	var result []analytics.DailyBreakdown
	for rows.Next() {
		var db analytics.DailyBreakdown
		if err := rows.Scan(&db.Date, &db.Minutes); err != nil {
			return nil, fmt.Errorf("failed to scan daily breakdown: %w", err)
		}
		result = append(result, db)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating daily breakdown: %w", err)
	}

	return result, nil
}

// GetWeeklyBreakdown returns weekly minutes for a date range (for monthly summary)
func (r *PostgresRepository) GetWeeklyBreakdown(ctx context.Context, userID, startDate, endDate string) ([]analytics.DailyBreakdown, error) {
	query := `
		SELECT
			date_trunc('week', date::date)::date as week_start,
			SUM(
				EXTRACT(EPOCH FROM (
					(date || ' ' || end_time)::timestamp -
					(date || ' ' || start_time)::timestamp
				)) / 60
			)::integer AS minutes
		FROM time_entries
		WHERE user_id = $1 AND date >= $2 AND date <= $3
		GROUP BY date_trunc('week', date::date)
		ORDER BY week_start ASC
	`

	rows, err := r.pool.Query(ctx, query, userID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to query weekly breakdown: %w", err)
	}
	defer rows.Close()

	var result []analytics.DailyBreakdown
	for rows.Next() {
		var db analytics.DailyBreakdown
		var weekStart time.Time
		if err := rows.Scan(&weekStart, &db.Minutes); err != nil {
			return nil, fmt.Errorf("failed to scan weekly breakdown: %w", err)
		}
		db.Date = weekStart.Format("2006-01-02")
		result = append(result, db)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating weekly breakdown: %w", err)
	}

	return result, nil
}
