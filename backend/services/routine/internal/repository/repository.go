package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kensan/backend/services/routine/internal"
)

// PostgresRepository handles database operations for routine tasks
type PostgresRepository struct {
	pool *pgxpool.Pool
}

// Ensure PostgresRepository implements Repository interface
var _ Repository = (*PostgresRepository)(nil)

// NewPostgresRepository creates a new routine repository
func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

// ListRoutines returns all routine tasks for a user with optional filters
func (r *PostgresRepository) ListRoutines(ctx context.Context, userID string, filter routine.RoutineFilter) ([]routine.RoutineTask, error) {
	query := `
		SELECT id, user_id, name, frequency, days_of_week, estimated_minutes, default_start_time, enabled, created_at, updated_at
		FROM routine_tasks
		WHERE user_id = $1
	`
	args := []interface{}{userID}
	argCount := 1

	if filter.Enabled != nil {
		argCount++
		query += fmt.Sprintf(" AND enabled = $%d", argCount)
		args = append(args, *filter.Enabled)
	}

	query += " ORDER BY created_at DESC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query routine tasks: %w", err)
	}
	defer rows.Close()

	var routines []routine.RoutineTask
	for rows.Next() {
		rt, err := r.scanRoutineTask(rows)
		if err != nil {
			return nil, err
		}
		routines = append(routines, *rt)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating routine tasks: %w", err)
	}

	return routines, nil
}

// GetRoutineByID returns a routine task by ID for a specific user
func (r *PostgresRepository) GetRoutineByID(ctx context.Context, userID, routineID string) (*routine.RoutineTask, error) {
	query := `
		SELECT id, user_id, name, frequency, days_of_week, estimated_minutes, default_start_time, enabled, created_at, updated_at
		FROM routine_tasks
		WHERE id = $1 AND user_id = $2
	`

	row := r.pool.QueryRow(ctx, query, routineID, userID)
	rt, err := r.scanRoutineTaskRow(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get routine task: %w", err)
	}

	return rt, nil
}

// CreateRoutine creates a new routine task
func (r *PostgresRepository) CreateRoutine(ctx context.Context, userID string, input routine.CreateRoutineInput) (*routine.RoutineTask, error) {
	id := uuid.New().String()
	now := time.Now()

	query := `
		INSERT INTO routine_tasks (id, user_id, name, frequency, days_of_week, estimated_minutes, default_start_time, enabled, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, user_id, name, frequency, days_of_week, estimated_minutes, default_start_time, enabled, created_at, updated_at
	`

	row := r.pool.QueryRow(ctx, query,
		id,
		userID,
		input.Name,
		string(input.Frequency),
		input.DaysOfWeek,
		input.EstimatedMinutes,
		input.DefaultStartTime,
		input.Enabled,
		now,
		now,
	)

	rt, err := r.scanRoutineTaskRow(row)
	if err != nil {
		return nil, fmt.Errorf("failed to create routine task: %w", err)
	}

	return rt, nil
}

// UpdateRoutine updates an existing routine task
func (r *PostgresRepository) UpdateRoutine(ctx context.Context, userID, routineID string, input routine.UpdateRoutineInput) (*routine.RoutineTask, error) {
	var setClauses []string
	var args []interface{}
	argCount := 0

	if input.Name != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("name = $%d", argCount))
		args = append(args, *input.Name)
	}

	if input.Frequency != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("frequency = $%d", argCount))
		args = append(args, string(*input.Frequency))
	}

	if input.DaysOfWeek != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("days_of_week = $%d", argCount))
		args = append(args, input.DaysOfWeek)
	}

	if input.EstimatedMinutes != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("estimated_minutes = $%d", argCount))
		args = append(args, *input.EstimatedMinutes)
	}

	if input.DefaultStartTime != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("default_start_time = $%d", argCount))
		args = append(args, *input.DefaultStartTime)
	}

	if input.Enabled != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("enabled = $%d", argCount))
		args = append(args, *input.Enabled)
	}

	if len(setClauses) == 0 {
		return r.GetRoutineByID(ctx, userID, routineID)
	}

	argCount++
	setClauses = append(setClauses, fmt.Sprintf("updated_at = $%d", argCount))
	args = append(args, time.Now())

	argCount++
	args = append(args, routineID)
	argCount++
	args = append(args, userID)

	query := fmt.Sprintf(`
		UPDATE routine_tasks
		SET %s
		WHERE id = $%d AND user_id = $%d
		RETURNING id, user_id, name, frequency, days_of_week, estimated_minutes, default_start_time, enabled, created_at, updated_at
	`, strings.Join(setClauses, ", "), argCount-1, argCount)

	row := r.pool.QueryRow(ctx, query, args...)
	rt, err := r.scanRoutineTaskRow(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to update routine task: %w", err)
	}

	return rt, nil
}

// ToggleRoutineEnabled toggles the enabled status of a routine task
func (r *PostgresRepository) ToggleRoutineEnabled(ctx context.Context, userID, routineID string) (*routine.RoutineTask, error) {
	query := `
		UPDATE routine_tasks
		SET enabled = NOT enabled, updated_at = $3
		WHERE id = $1 AND user_id = $2
		RETURNING id, user_id, name, frequency, days_of_week, estimated_minutes, default_start_time, enabled, created_at, updated_at
	`

	row := r.pool.QueryRow(ctx, query, routineID, userID, time.Now())
	rt, err := r.scanRoutineTaskRow(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to toggle routine enabled: %w", err)
	}

	return rt, nil
}

// DeleteRoutine deletes a routine task
func (r *PostgresRepository) DeleteRoutine(ctx context.Context, userID, routineID string) error {
	query := `DELETE FROM routine_tasks WHERE id = $1 AND user_id = $2`
	result, err := r.pool.Exec(ctx, query, routineID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete routine task: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("routine task not found")
	}

	return nil
}

// scanRoutineTask scans a routine task from rows
func (r *PostgresRepository) scanRoutineTask(rows pgx.Rows) (*routine.RoutineTask, error) {
	var rt routine.RoutineTask
	var frequency string
	err := rows.Scan(
		&rt.ID,
		&rt.UserID,
		&rt.Name,
		&frequency,
		&rt.DaysOfWeek,
		&rt.EstimatedMinutes,
		&rt.DefaultStartTime,
		&rt.Enabled,
		&rt.CreatedAt,
		&rt.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to scan routine task: %w", err)
	}
	rt.Frequency = routine.RoutineFrequency(frequency)
	return &rt, nil
}

// scanRoutineTaskRow scans a routine task from a single row
func (r *PostgresRepository) scanRoutineTaskRow(row pgx.Row) (*routine.RoutineTask, error) {
	var rt routine.RoutineTask
	var frequency string
	err := row.Scan(
		&rt.ID,
		&rt.UserID,
		&rt.Name,
		&frequency,
		&rt.DaysOfWeek,
		&rt.EstimatedMinutes,
		&rt.DefaultStartTime,
		&rt.Enabled,
		&rt.CreatedAt,
		&rt.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	rt.Frequency = routine.RoutineFrequency(frequency)
	return &rt, nil
}
