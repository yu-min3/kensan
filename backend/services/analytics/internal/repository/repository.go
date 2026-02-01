package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	analytics "github.com/kensan/backend/services/analytics/internal"
	sharedErrors "github.com/kensan/backend/shared/errors"
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

// wrapDBError wraps a database error with context message and detects schema errors
func wrapDBError(msg string, err error) error {
	return fmt.Errorf("%s: %w", msg, sharedErrors.WrapDatabaseError(err))
}

// GetTimeBlocksAggregated returns aggregated time blocks (planned time) for a datetime range
func (r *PostgresRepository) GetTimeBlocksAggregated(ctx context.Context, userID, startDatetime, endDatetime string) (int, error) {
	query := `
		SELECT COALESCE(SUM(
			EXTRACT(EPOCH FROM (end_datetime - start_datetime)) / 60
		)::integer, 0) AS total_minutes
		FROM analytics_time_blocks
		WHERE user_id = $1 AND start_datetime >= $2::timestamptz AND start_datetime < $3::timestamptz
			AND goal_id IS NOT NULL
	`

	var totalMinutes int
	err := r.pool.QueryRow(ctx, query, userID, startDatetime, endDatetime).Scan(&totalMinutes)
	if err != nil {
		return 0, wrapDBError("failed to query time blocks", err)
	}

	return totalMinutes, nil
}

// GetCompletedTasksCount returns the count of tasks completed within a date range
func (r *PostgresRepository) GetCompletedTasksCount(ctx context.Context, userID, startDate, endDate string) (int, error) {
	// Tasks table has updated_at column, so we check tasks that are completed
	// and were updated within the date range
	query := `
		SELECT COUNT(*)
		FROM analytics_tasks
		WHERE user_id = $1
			AND completed = true
			AND updated_at >= $2::date
			AND updated_at < ($3::date + INTERVAL '1 day')
	`

	var count int
	err := r.pool.QueryRow(ctx, query, userID, startDate, endDate).Scan(&count)
	if err != nil {
		return 0, wrapDBError("failed to count completed tasks", err)
	}

	return count, nil
}

// GetTotalMinutesByDateRange returns total minutes for a datetime range
func (r *PostgresRepository) GetTotalMinutesByDateRange(ctx context.Context, userID, startDatetime, endDatetime string) (int, error) {
	query := `
		SELECT COALESCE(SUM(
			EXTRACT(EPOCH FROM (end_datetime - start_datetime)) / 60
		)::integer, 0) AS total_minutes
		FROM analytics_time_entries
		WHERE user_id = $1 AND start_datetime >= $2::timestamptz AND start_datetime < $3::timestamptz
			AND goal_id IS NOT NULL
	`

	var totalMinutes int
	err := r.pool.QueryRow(ctx, query, userID, startDatetime, endDatetime).Scan(&totalMinutes)
	if err != nil {
		return 0, wrapDBError("failed to get total minutes", err)
	}

	return totalMinutes, nil
}

// GetDailyBreakdown returns daily minutes for a datetime range, grouped by local date
func (r *PostgresRepository) GetDailyBreakdown(ctx context.Context, userID, startDatetime, endDatetime, timezone string) ([]analytics.DailyBreakdown, error) {
	query := `
		SELECT
			(start_datetime AT TIME ZONE $4)::date::text AS local_date,
			SUM(
				EXTRACT(EPOCH FROM (end_datetime - start_datetime)) / 60
			)::integer AS minutes
		FROM analytics_time_entries
		WHERE user_id = $1 AND start_datetime >= $2::timestamptz AND start_datetime < $3::timestamptz
		GROUP BY (start_datetime AT TIME ZONE $4)::date
		ORDER BY local_date ASC
	`

	rows, err := r.pool.Query(ctx, query, userID, startDatetime, endDatetime, timezone)
	if err != nil {
		return nil, wrapDBError("failed to query daily breakdown", err)
	}
	defer rows.Close()

	var result []analytics.DailyBreakdown
	for rows.Next() {
		var db analytics.DailyBreakdown
		if err := rows.Scan(&db.Date, &db.Minutes); err != nil {
			return nil, wrapDBError("failed to scan daily breakdown", err)
		}
		result = append(result, db)
	}

	if err := rows.Err(); err != nil {
		return nil, wrapDBError("error iterating daily breakdown", err)
	}

	return result, nil
}

// GetWeeklyBreakdown returns weekly minutes for a datetime range (for monthly summary)
func (r *PostgresRepository) GetWeeklyBreakdown(ctx context.Context, userID, startDatetime, endDatetime, timezone string) ([]analytics.DailyBreakdown, error) {
	query := `
		SELECT
			date_trunc('week', (start_datetime AT TIME ZONE $4)::date)::date AS week_start,
			SUM(
				EXTRACT(EPOCH FROM (end_datetime - start_datetime)) / 60
			)::integer AS minutes
		FROM analytics_time_entries
		WHERE user_id = $1 AND start_datetime >= $2::timestamptz AND start_datetime < $3::timestamptz
		GROUP BY date_trunc('week', (start_datetime AT TIME ZONE $4)::date)
		ORDER BY week_start ASC
	`

	rows, err := r.pool.Query(ctx, query, userID, startDatetime, endDatetime, timezone)
	if err != nil {
		return nil, wrapDBError("failed to query weekly breakdown", err)
	}
	defer rows.Close()

	var result []analytics.DailyBreakdown
	for rows.Next() {
		var db analytics.DailyBreakdown
		var weekStart time.Time
		if err := rows.Scan(&weekStart, &db.Minutes); err != nil {
			return nil, wrapDBError("failed to scan weekly breakdown", err)
		}
		db.Date = weekStart.Format("2006-01-02")
		result = append(result, db)
	}

	if err := rows.Err(); err != nil {
		return nil, wrapDBError("error iterating weekly breakdown", err)
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

// GetMinutesByGoal returns minutes aggregated by goal for a datetime range
func (r *PostgresRepository) GetMinutesByGoal(ctx context.Context, userID, startDatetime, endDatetime string) ([]GoalWithMinutes, error) {
	query := `
		SELECT
			te.goal_id::text as goal_id,
			COALESCE(te.goal_name, g.name, 'Unknown') as goal_name,
			COALESCE(te.goal_color, g.color, '#6B7280') as goal_color,
			SUM(
				EXTRACT(EPOCH FROM (te.end_datetime - te.start_datetime)) / 60
			)::integer AS minutes
		FROM analytics_time_entries te
		LEFT JOIN goals g ON te.goal_id = g.id
		WHERE te.user_id = $1 AND te.start_datetime >= $2::timestamptz AND te.start_datetime < $3::timestamptz AND te.goal_id IS NOT NULL
		GROUP BY te.goal_id, COALESCE(te.goal_name, g.name, 'Unknown'), COALESCE(te.goal_color, g.color, '#6B7280')
		ORDER BY minutes DESC
	`

	rows, err := r.pool.Query(ctx, query, userID, startDatetime, endDatetime)
	if err != nil {
		return nil, wrapDBError("failed to query minutes by goal", err)
	}
	defer rows.Close()

	var result []GoalWithMinutes
	for rows.Next() {
		var g GoalWithMinutes
		if err := rows.Scan(&g.ID, &g.Name, &g.Color, &g.Minutes); err != nil {
			return nil, wrapDBError("failed to scan goal minutes", err)
		}
		result = append(result, g)
	}

	if err := rows.Err(); err != nil {
		return nil, wrapDBError("error iterating goal minutes", err)
	}

	return result, nil
}

// GetMinutesByMilestone returns minutes aggregated by milestone for a datetime range
func (r *PostgresRepository) GetMinutesByMilestone(ctx context.Context, userID, startDatetime, endDatetime string) ([]MilestoneWithMinutes, error) {
	query := `
		SELECT
			te.milestone_id::text as milestone_id,
			COALESCE(te.milestone_name, m.name, 'Unknown') as milestone_name,
			COALESCE(te.goal_id::text, m.goal_id::text, '') as goal_id,
			SUM(
				EXTRACT(EPOCH FROM (te.end_datetime - te.start_datetime)) / 60
			)::integer AS minutes
		FROM analytics_time_entries te
		LEFT JOIN milestones m ON te.milestone_id = m.id
		WHERE te.user_id = $1 AND te.start_datetime >= $2::timestamptz AND te.start_datetime < $3::timestamptz AND te.milestone_id IS NOT NULL
		GROUP BY te.milestone_id, COALESCE(te.milestone_name, m.name, 'Unknown'), COALESCE(te.goal_id::text, m.goal_id::text, '')
		ORDER BY minutes DESC
	`

	rows, err := r.pool.Query(ctx, query, userID, startDatetime, endDatetime)
	if err != nil {
		return nil, wrapDBError("failed to query minutes by milestone", err)
	}
	defer rows.Close()

	var result []MilestoneWithMinutes
	for rows.Next() {
		var m MilestoneWithMinutes
		if err := rows.Scan(&m.ID, &m.Name, &m.GoalID, &m.Minutes); err != nil {
			return nil, wrapDBError("failed to scan milestone minutes", err)
		}
		result = append(result, m)
	}

	if err := rows.Err(); err != nil {
		return nil, wrapDBError("error iterating milestone minutes", err)
	}

	return result, nil
}

// GetMinutesByTag returns minutes aggregated by tag for a datetime range
func (r *PostgresRepository) GetMinutesByTag(ctx context.Context, userID, startDatetime, endDatetime string) ([]TagWithMinutes, error) {
	query := `
		WITH tag_entries AS (
			SELECT
				unnest(te.tag_ids) as tag_id,
				EXTRACT(EPOCH FROM (te.end_datetime - te.start_datetime)) / 60 AS minutes
			FROM analytics_time_entries te
			WHERE te.user_id = $1 AND te.start_datetime >= $2::timestamptz AND te.start_datetime < $3::timestamptz AND te.tag_ids IS NOT NULL AND array_length(te.tag_ids, 1) > 0
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

	rows, err := r.pool.Query(ctx, query, userID, startDatetime, endDatetime)
	if err != nil {
		return nil, wrapDBError("failed to query minutes by tag", err)
	}
	defer rows.Close()

	var result []TagWithMinutes
	for rows.Next() {
		var t TagWithMinutes
		if err := rows.Scan(&t.ID, &t.Name, &t.Color, &t.Minutes); err != nil {
			return nil, wrapDBError("failed to scan tag minutes", err)
		}
		result = append(result, t)
	}

	if err := rows.Err(); err != nil {
		return nil, wrapDBError("error iterating tag minutes", err)
	}

	return result, nil
}

// GetGoals returns all goals for a user
func (r *PostgresRepository) GetGoals(ctx context.Context, userID string) ([]analytics.GoalSummary, error) {
	query := `
		SELECT id, name, color
		FROM analytics_goals
		WHERE user_id = $1 AND is_archived = false
		ORDER BY name ASC
	`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, wrapDBError("failed to query goals", err)
	}
	defer rows.Close()

	var result []analytics.GoalSummary
	for rows.Next() {
		var g analytics.GoalSummary
		if err := rows.Scan(&g.ID, &g.Name, &g.Color); err != nil {
			return nil, wrapDBError("failed to scan goal", err)
		}
		result = append(result, g)
	}

	if err := rows.Err(); err != nil {
		return nil, wrapDBError("error iterating goals", err)
	}

	return result, nil
}
