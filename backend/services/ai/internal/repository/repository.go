package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kensan/backend/services/ai/internal"
)

// Compile-time interface implementation check
var _ Repository = (*PostgresRepository)(nil)

// PostgresRepository handles database operations for AI review reports
type PostgresRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresRepository creates a new AI repository
func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

// CreateReport creates a new AI review report
func (r *PostgresRepository) CreateReport(ctx context.Context, report *ai.AIReviewReport) error {
	report.ID = uuid.New().String()
	report.CreatedAt = time.Now()

	goodPointsJSON, err := json.Marshal(report.GoodPoints)
	if err != nil {
		return fmt.Errorf("failed to marshal good_points: %w", err)
	}

	improvementPointsJSON, err := json.Marshal(report.ImprovementPoints)
	if err != nil {
		return fmt.Errorf("failed to marshal improvement_points: %w", err)
	}

	adviceJSON, err := json.Marshal(report.Advice)
	if err != nil {
		return fmt.Errorf("failed to marshal advice: %w", err)
	}

	query := `
		INSERT INTO ai_review_reports (
			id, user_id, week_start, week_end, summary,
			good_points, improvement_points, advice,
			tokens_input, tokens_output, created_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`

	_, err = r.pool.Exec(ctx, query,
		report.ID,
		report.UserID,
		report.WeekStart,
		report.WeekEnd,
		report.Summary,
		goodPointsJSON,
		improvementPointsJSON,
		adviceJSON,
		report.TokensUsed.Input,
		report.TokensUsed.Output,
		report.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to create report: %w", err)
	}

	return nil
}

// GetReportByID retrieves a report by ID for a specific user
func (r *PostgresRepository) GetReportByID(ctx context.Context, userID, reportID string) (*ai.AIReviewReport, error) {
	query := `
		SELECT id, user_id, week_start, week_end, summary,
		       good_points, improvement_points, advice,
		       tokens_input, tokens_output, created_at
		FROM ai_review_reports
		WHERE id = $1 AND user_id = $2
	`

	var report ai.AIReviewReport
	var goodPointsJSON, improvementPointsJSON, adviceJSON []byte

	err := r.pool.QueryRow(ctx, query, reportID, userID).Scan(
		&report.ID,
		&report.UserID,
		&report.WeekStart,
		&report.WeekEnd,
		&report.Summary,
		&goodPointsJSON,
		&improvementPointsJSON,
		&adviceJSON,
		&report.TokensUsed.Input,
		&report.TokensUsed.Output,
		&report.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get report: %w", err)
	}

	if err := json.Unmarshal(goodPointsJSON, &report.GoodPoints); err != nil {
		return nil, fmt.Errorf("failed to unmarshal good_points: %w", err)
	}
	if err := json.Unmarshal(improvementPointsJSON, &report.ImprovementPoints); err != nil {
		return nil, fmt.Errorf("failed to unmarshal improvement_points: %w", err)
	}
	if err := json.Unmarshal(adviceJSON, &report.Advice); err != nil {
		return nil, fmt.Errorf("failed to unmarshal advice: %w", err)
	}

	return &report, nil
}

// ListReports returns all reports for a user with optional date filters
func (r *PostgresRepository) ListReports(ctx context.Context, userID string, filter ai.ReviewFilter) ([]ai.AIReviewReport, error) {
	query := `
		SELECT id, user_id, week_start, week_end, summary,
		       good_points, improvement_points, advice,
		       tokens_input, tokens_output, created_at
		FROM ai_review_reports
		WHERE user_id = $1
	`
	args := []interface{}{userID}
	argCount := 1

	if filter.StartDate != nil {
		argCount++
		query += fmt.Sprintf(" AND week_start >= $%d", argCount)
		args = append(args, *filter.StartDate)
	}

	if filter.EndDate != nil {
		argCount++
		query += fmt.Sprintf(" AND week_end <= $%d", argCount)
		args = append(args, *filter.EndDate)
	}

	query += " ORDER BY week_start DESC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query reports: %w", err)
	}
	defer rows.Close()

	var reports []ai.AIReviewReport
	for rows.Next() {
		var report ai.AIReviewReport
		var goodPointsJSON, improvementPointsJSON, adviceJSON []byte

		err := rows.Scan(
			&report.ID,
			&report.UserID,
			&report.WeekStart,
			&report.WeekEnd,
			&report.Summary,
			&goodPointsJSON,
			&improvementPointsJSON,
			&adviceJSON,
			&report.TokensUsed.Input,
			&report.TokensUsed.Output,
			&report.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan report: %w", err)
		}

		if err := json.Unmarshal(goodPointsJSON, &report.GoodPoints); err != nil {
			return nil, fmt.Errorf("failed to unmarshal good_points: %w", err)
		}
		if err := json.Unmarshal(improvementPointsJSON, &report.ImprovementPoints); err != nil {
			return nil, fmt.Errorf("failed to unmarshal improvement_points: %w", err)
		}
		if err := json.Unmarshal(adviceJSON, &report.Advice); err != nil {
			return nil, fmt.Errorf("failed to unmarshal advice: %w", err)
		}

		reports = append(reports, report)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating reports: %w", err)
	}

	return reports, nil
}

// GetTimeEntriesForPeriod retrieves time entries for a specific period
func (r *PostgresRepository) GetTimeEntriesForPeriod(ctx context.Context, userID, startDate, endDate string) ([]ai.TimeEntryData, error) {
	query := `
		SELECT te.description, COALESCE(te.goal_name, 'Unknown') as project_name,
		       te.duration, te.start_time, te.end_time
		FROM time_entries te
		WHERE te.user_id = $1
		  AND te.start_time >= $2::date
		  AND te.start_time < ($3::date + interval '1 day')
		ORDER BY te.start_time
	`

	rows, err := r.pool.Query(ctx, query, userID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to query time entries: %w", err)
	}
	defer rows.Close()

	var entries []ai.TimeEntryData
	for rows.Next() {
		var entry ai.TimeEntryData
		err := rows.Scan(
			&entry.Description,
			&entry.ProjectName,
			&entry.Duration,
			&entry.StartTime,
			&entry.EndTime,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan time entry: %w", err)
		}
		entries = append(entries, entry)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating time entries: %w", err)
	}

	return entries, nil
}

// GetLearningRecordsForPeriod retrieves learning records for a specific period
func (r *PostgresRepository) GetLearningRecordsForPeriod(ctx context.Context, userID, startDate, endDate string) ([]ai.LearningRecordData, error) {
	query := `
		SELECT lr.title, lr.content,
		       COALESCE(lr.goal_id, '') as goal_id,
		       COALESCE(g.name, '') as goal_name,
		       COALESCE(g.color, '') as goal_color,
		       COALESCE(lr.milestone_id, '') as milestone_id,
		       COALESCE(m.name, '') as milestone_name
		FROM learning_records lr
		LEFT JOIN goals g ON lr.goal_id = g.id
		LEFT JOIN milestones m ON lr.milestone_id = m.id
		WHERE lr.user_id = $1
		  AND lr.created_at >= $2::date
		  AND lr.created_at < ($3::date + interval '1 day')
		ORDER BY lr.created_at
	`

	rows, err := r.pool.Query(ctx, query, userID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to query learning records: %w", err)
	}
	defer rows.Close()

	var records []ai.LearningRecordData
	for rows.Next() {
		var record ai.LearningRecordData
		err := rows.Scan(
			&record.Title,
			&record.Content,
			&record.GoalID,
			&record.GoalName,
			&record.GoalColor,
			&record.MilestoneID,
			&record.MilestoneName,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan learning record: %w", err)
		}
		records = append(records, record)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating learning records: %w", err)
	}

	return records, nil
}

// DeleteReport deletes a report by ID
func (r *PostgresRepository) DeleteReport(ctx context.Context, userID, reportID string) error {
	query := `DELETE FROM ai_review_reports WHERE id = $1 AND user_id = $2`
	result, err := r.pool.Exec(ctx, query, reportID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete report: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("report not found")
	}

	return nil
}
