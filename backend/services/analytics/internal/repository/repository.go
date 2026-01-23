package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	analytics "github.com/kensan/backend/services/analytics/internal"
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

// ========== New Data Model Methods ==========

// GoalWithMinutes represents a goal with aggregated minutes
type GoalWithMinutes struct {
	ID      string
	Name    string
	Color   string
	Minutes int
}

// MilestoneWithMinutes represents a milestone with aggregated minutes
type MilestoneWithMinutes struct {
	ID      string
	Name    string
	GoalID  string
	Minutes int
}

// TagWithMinutes represents a tag with aggregated minutes
type TagWithMinutes struct {
	ID      string
	Name    string
	Color   string
	Minutes int
}

// GetMinutesByGoal returns minutes aggregated by goal for a date range
func (r *PostgresRepository) GetMinutesByGoal(ctx context.Context, userID, startDate, endDate string) ([]GoalWithMinutes, error) {
	query := `
		SELECT
			te.goal_id::text as goal_id,
			COALESCE(te.goal_name, g.name, 'Unknown') as goal_name,
			COALESCE(te.goal_color, g.color, '#6B7280') as goal_color,
			SUM(
				EXTRACT(EPOCH FROM (
					(te.date || ' ' || te.end_time)::timestamp -
					(te.date || ' ' || te.start_time)::timestamp
				)) / 60
			)::integer AS minutes
		FROM time_entries te
		LEFT JOIN goals g ON te.goal_id = g.id
		WHERE te.user_id = $1 AND te.date >= $2 AND te.date <= $3 AND te.goal_id IS NOT NULL
		GROUP BY te.goal_id, COALESCE(te.goal_name, g.name, 'Unknown'), COALESCE(te.goal_color, g.color, '#6B7280')
		ORDER BY minutes DESC
	`

	rows, err := r.pool.Query(ctx, query, userID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to query minutes by goal: %w", err)
	}
	defer rows.Close()

	var result []GoalWithMinutes
	for rows.Next() {
		var g GoalWithMinutes
		if err := rows.Scan(&g.ID, &g.Name, &g.Color, &g.Minutes); err != nil {
			return nil, fmt.Errorf("failed to scan goal minutes: %w", err)
		}
		result = append(result, g)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating goal minutes: %w", err)
	}

	return result, nil
}

// GetMinutesByMilestone returns minutes aggregated by milestone for a date range
func (r *PostgresRepository) GetMinutesByMilestone(ctx context.Context, userID, startDate, endDate string) ([]MilestoneWithMinutes, error) {
	query := `
		SELECT
			te.milestone_id::text as milestone_id,
			COALESCE(te.milestone_name, m.name, 'Unknown') as milestone_name,
			COALESCE(te.goal_id::text, m.goal_id::text, '') as goal_id,
			SUM(
				EXTRACT(EPOCH FROM (
					(te.date || ' ' || te.end_time)::timestamp -
					(te.date || ' ' || te.start_time)::timestamp
				)) / 60
			)::integer AS minutes
		FROM time_entries te
		LEFT JOIN milestones m ON te.milestone_id = m.id
		WHERE te.user_id = $1 AND te.date >= $2 AND te.date <= $3 AND te.milestone_id IS NOT NULL
		GROUP BY te.milestone_id, COALESCE(te.milestone_name, m.name, 'Unknown'), COALESCE(te.goal_id::text, m.goal_id::text, '')
		ORDER BY minutes DESC
	`

	rows, err := r.pool.Query(ctx, query, userID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to query minutes by milestone: %w", err)
	}
	defer rows.Close()

	var result []MilestoneWithMinutes
	for rows.Next() {
		var m MilestoneWithMinutes
		if err := rows.Scan(&m.ID, &m.Name, &m.GoalID, &m.Minutes); err != nil {
			return nil, fmt.Errorf("failed to scan milestone minutes: %w", err)
		}
		result = append(result, m)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating milestone minutes: %w", err)
	}

	return result, nil
}

// GetMinutesByTag returns minutes aggregated by tag for a date range
func (r *PostgresRepository) GetMinutesByTag(ctx context.Context, userID, startDate, endDate string) ([]TagWithMinutes, error) {
	query := `
		WITH tag_entries AS (
			SELECT
				unnest(te.tag_ids) as tag_id,
				EXTRACT(EPOCH FROM (
					(te.date || ' ' || te.end_time)::timestamp -
					(te.date || ' ' || te.start_time)::timestamp
				)) / 60 AS minutes
			FROM time_entries te
			WHERE te.user_id = $1 AND te.date >= $2 AND te.date <= $3 AND te.tag_ids IS NOT NULL AND array_length(te.tag_ids, 1) > 0
		)
		SELECT
			tg.id,
			tg.name,
			tg.color,
			SUM(te.minutes)::integer AS minutes
		FROM tag_entries te
		JOIN tags tg ON te.tag_id = tg.id
		GROUP BY tg.id, tg.name, tg.color
		ORDER BY minutes DESC
	`

	rows, err := r.pool.Query(ctx, query, userID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to query minutes by tag: %w", err)
	}
	defer rows.Close()

	var result []TagWithMinutes
	for rows.Next() {
		var t TagWithMinutes
		if err := rows.Scan(&t.ID, &t.Name, &t.Color, &t.Minutes); err != nil {
			return nil, fmt.Errorf("failed to scan tag minutes: %w", err)
		}
		result = append(result, t)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating tag minutes: %w", err)
	}

	return result, nil
}

// GetGoals returns all goals for a user
func (r *PostgresRepository) GetGoals(ctx context.Context, userID string) ([]analytics.GoalSummary, error) {
	query := `
		SELECT id, name, color
		FROM goals
		WHERE user_id = $1 AND is_archived = false
		ORDER BY name ASC
	`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query goals: %w", err)
	}
	defer rows.Close()

	var result []analytics.GoalSummary
	for rows.Next() {
		var g analytics.GoalSummary
		if err := rows.Scan(&g.ID, &g.Name, &g.Color); err != nil {
			return nil, fmt.Errorf("failed to scan goal: %w", err)
		}
		result = append(result, g)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating goals: %w", err)
	}

	return result, nil
}
