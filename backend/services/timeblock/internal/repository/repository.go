package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kensan/backend/services/timeblock/internal"
)

// PostgresRepository handles database operations for time blocks and time entries
type PostgresRepository struct {
	pool *pgxpool.Pool
}

// Ensure PostgresRepository implements Repository interface
var _ Repository = (*PostgresRepository)(nil)

// NewPostgresRepository creates a new timeblock repository
func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

// ========== TimeBlock Operations ==========

// ListTimeBlocks returns all time blocks for a user with optional filters
func (r *PostgresRepository) ListTimeBlocks(ctx context.Context, userID string, filter timeblock.TimeBlockFilter) ([]timeblock.TimeBlock, error) {
	query := `
		SELECT id, user_id, date, start_time, end_time, task_id, task_name, project_id, project_name, goal_tag, is_routine, routine_task_id, created_at, updated_at
		FROM time_blocks
		WHERE user_id = $1
	`
	args := []interface{}{userID}
	argCount := 1

	if filter.Date != nil {
		argCount++
		query += fmt.Sprintf(" AND date = $%d", argCount)
		args = append(args, *filter.Date)
	}

	if filter.StartDate != nil {
		argCount++
		query += fmt.Sprintf(" AND date >= $%d", argCount)
		args = append(args, *filter.StartDate)
	}

	if filter.EndDate != nil {
		argCount++
		query += fmt.Sprintf(" AND date <= $%d", argCount)
		args = append(args, *filter.EndDate)
	}

	query += " ORDER BY date ASC, start_time ASC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query time blocks: %w", err)
	}
	defer rows.Close()

	var blocks []timeblock.TimeBlock
	for rows.Next() {
		var tb timeblock.TimeBlock
		var goalTag *string
		err := rows.Scan(
			&tb.ID,
			&tb.UserID,
			&tb.Date,
			&tb.StartTime,
			&tb.EndTime,
			&tb.TaskID,
			&tb.TaskName,
			&tb.ProjectID,
			&tb.ProjectName,
			&goalTag,
			&tb.IsRoutine,
			&tb.RoutineTaskID,
			&tb.CreatedAt,
			&tb.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan time block: %w", err)
		}
		if goalTag != nil {
			gt := timeblock.GoalTag(*goalTag)
			tb.GoalTag = &gt
		}
		blocks = append(blocks, tb)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating time blocks: %w", err)
	}

	return blocks, nil
}

// GetTimeBlockByID returns a time block by ID for a specific user
func (r *PostgresRepository) GetTimeBlockByID(ctx context.Context, userID, timeBlockID string) (*timeblock.TimeBlock, error) {
	query := `
		SELECT id, user_id, date, start_time, end_time, task_id, task_name, project_id, project_name, goal_tag, is_routine, routine_task_id, created_at, updated_at
		FROM time_blocks
		WHERE id = $1 AND user_id = $2
	`

	var tb timeblock.TimeBlock
	var goalTag *string
	err := r.pool.QueryRow(ctx, query, timeBlockID, userID).Scan(
		&tb.ID,
		&tb.UserID,
		&tb.Date,
		&tb.StartTime,
		&tb.EndTime,
		&tb.TaskID,
		&tb.TaskName,
		&tb.ProjectID,
		&tb.ProjectName,
		&goalTag,
		&tb.IsRoutine,
		&tb.RoutineTaskID,
		&tb.CreatedAt,
		&tb.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get time block: %w", err)
	}

	if goalTag != nil {
		gt := timeblock.GoalTag(*goalTag)
		tb.GoalTag = &gt
	}

	return &tb, nil
}

// CreateTimeBlock creates a new time block
func (r *PostgresRepository) CreateTimeBlock(ctx context.Context, userID string, input timeblock.CreateTimeBlockInput) (*timeblock.TimeBlock, error) {
	id := uuid.New().String()
	now := time.Now()

	var goalTag *string
	if input.GoalTag != nil {
		s := string(*input.GoalTag)
		goalTag = &s
	}

	query := `
		INSERT INTO time_blocks (id, user_id, date, start_time, end_time, task_id, task_name, project_id, project_name, goal_tag, is_routine, routine_task_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		RETURNING id, user_id, date, start_time, end_time, task_id, task_name, project_id, project_name, goal_tag, is_routine, routine_task_id, created_at, updated_at
	`

	var tb timeblock.TimeBlock
	var returnedGoalTag *string
	err := r.pool.QueryRow(ctx, query,
		id,
		userID,
		input.Date,
		input.StartTime,
		input.EndTime,
		input.TaskID,
		input.TaskName,
		input.ProjectID,
		input.ProjectName,
		goalTag,
		input.IsRoutine,
		input.RoutineTaskID,
		now,
		now,
	).Scan(
		&tb.ID,
		&tb.UserID,
		&tb.Date,
		&tb.StartTime,
		&tb.EndTime,
		&tb.TaskID,
		&tb.TaskName,
		&tb.ProjectID,
		&tb.ProjectName,
		&returnedGoalTag,
		&tb.IsRoutine,
		&tb.RoutineTaskID,
		&tb.CreatedAt,
		&tb.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create time block: %w", err)
	}

	if returnedGoalTag != nil {
		gt := timeblock.GoalTag(*returnedGoalTag)
		tb.GoalTag = &gt
	}

	return &tb, nil
}

// UpdateTimeBlock updates an existing time block
func (r *PostgresRepository) UpdateTimeBlock(ctx context.Context, userID, timeBlockID string, input timeblock.UpdateTimeBlockInput) (*timeblock.TimeBlock, error) {
	var setClauses []string
	var args []interface{}
	argCount := 0

	if input.Date != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("date = $%d", argCount))
		args = append(args, *input.Date)
	}

	if input.StartTime != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("start_time = $%d", argCount))
		args = append(args, *input.StartTime)
	}

	if input.EndTime != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("end_time = $%d", argCount))
		args = append(args, *input.EndTime)
	}

	if input.TaskID != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("task_id = $%d", argCount))
		args = append(args, *input.TaskID)
	}

	if input.TaskName != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("task_name = $%d", argCount))
		args = append(args, *input.TaskName)
	}

	if input.ProjectID != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("project_id = $%d", argCount))
		args = append(args, *input.ProjectID)
	}

	if input.ProjectName != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("project_name = $%d", argCount))
		args = append(args, *input.ProjectName)
	}

	if input.GoalTag != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("goal_tag = $%d", argCount))
		args = append(args, string(*input.GoalTag))
	}

	if input.IsRoutine != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("is_routine = $%d", argCount))
		args = append(args, *input.IsRoutine)
	}

	if input.RoutineTaskID != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("routine_task_id = $%d", argCount))
		args = append(args, *input.RoutineTaskID)
	}

	if len(setClauses) == 0 {
		return r.GetTimeBlockByID(ctx, userID, timeBlockID)
	}

	argCount++
	setClauses = append(setClauses, fmt.Sprintf("updated_at = $%d", argCount))
	args = append(args, time.Now())

	argCount++
	args = append(args, timeBlockID)
	argCount++
	args = append(args, userID)

	query := fmt.Sprintf(`
		UPDATE time_blocks
		SET %s
		WHERE id = $%d AND user_id = $%d
		RETURNING id, user_id, date, start_time, end_time, task_id, task_name, project_id, project_name, goal_tag, is_routine, routine_task_id, created_at, updated_at
	`, strings.Join(setClauses, ", "), argCount-1, argCount)

	var tb timeblock.TimeBlock
	var goalTag *string
	err := r.pool.QueryRow(ctx, query, args...).Scan(
		&tb.ID,
		&tb.UserID,
		&tb.Date,
		&tb.StartTime,
		&tb.EndTime,
		&tb.TaskID,
		&tb.TaskName,
		&tb.ProjectID,
		&tb.ProjectName,
		&goalTag,
		&tb.IsRoutine,
		&tb.RoutineTaskID,
		&tb.CreatedAt,
		&tb.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to update time block: %w", err)
	}

	if goalTag != nil {
		gt := timeblock.GoalTag(*goalTag)
		tb.GoalTag = &gt
	}

	return &tb, nil
}

// DeleteTimeBlock deletes a time block
func (r *PostgresRepository) DeleteTimeBlock(ctx context.Context, userID, timeBlockID string) error {
	query := `DELETE FROM time_blocks WHERE id = $1 AND user_id = $2`
	result, err := r.pool.Exec(ctx, query, timeBlockID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete time block: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("time block not found")
	}

	return nil
}

// CreateTimeBlockBatch creates multiple time blocks in a batch
func (r *PostgresRepository) CreateTimeBlockBatch(ctx context.Context, userID string, inputs []timeblock.CreateTimeBlockInput) ([]timeblock.TimeBlock, error) {
	if len(inputs) == 0 {
		return []timeblock.TimeBlock{}, nil
	}

	var blocks []timeblock.TimeBlock
	for _, input := range inputs {
		tb, err := r.CreateTimeBlock(ctx, userID, input)
		if err != nil {
			return nil, err
		}
		blocks = append(blocks, *tb)
	}

	return blocks, nil
}

// ========== TimeEntry Operations ==========

// ListTimeEntries returns all time entries for a user with optional filters
func (r *PostgresRepository) ListTimeEntries(ctx context.Context, userID string, filter timeblock.TimeEntryFilter) ([]timeblock.TimeEntry, error) {
	query := `
		SELECT id, clockify_id, user_id, date, start_time, end_time, task_id, task_name, project_id, project_name, goal_tag, description, created_at, updated_at
		FROM time_entries
		WHERE user_id = $1
	`
	args := []interface{}{userID}
	argCount := 1

	if filter.Date != nil {
		argCount++
		query += fmt.Sprintf(" AND date = $%d", argCount)
		args = append(args, *filter.Date)
	}

	if filter.StartDate != nil {
		argCount++
		query += fmt.Sprintf(" AND date >= $%d", argCount)
		args = append(args, *filter.StartDate)
	}

	if filter.EndDate != nil {
		argCount++
		query += fmt.Sprintf(" AND date <= $%d", argCount)
		args = append(args, *filter.EndDate)
	}

	if filter.ProjectID != nil {
		argCount++
		query += fmt.Sprintf(" AND project_id = $%d", argCount)
		args = append(args, *filter.ProjectID)
	}

	if filter.GoalTag != nil {
		argCount++
		query += fmt.Sprintf(" AND goal_tag = $%d", argCount)
		args = append(args, string(*filter.GoalTag))
	}

	query += " ORDER BY date ASC, start_time ASC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query time entries: %w", err)
	}
	defer rows.Close()

	var entries []timeblock.TimeEntry
	for rows.Next() {
		var te timeblock.TimeEntry
		var goalTag *string
		err := rows.Scan(
			&te.ID,
			&te.ClockifyID,
			&te.UserID,
			&te.Date,
			&te.StartTime,
			&te.EndTime,
			&te.TaskID,
			&te.TaskName,
			&te.ProjectID,
			&te.ProjectName,
			&goalTag,
			&te.Description,
			&te.CreatedAt,
			&te.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan time entry: %w", err)
		}
		if goalTag != nil {
			gt := timeblock.GoalTag(*goalTag)
			te.GoalTag = &gt
		}
		entries = append(entries, te)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating time entries: %w", err)
	}

	return entries, nil
}

// GetTimeEntryByID returns a time entry by ID for a specific user
func (r *PostgresRepository) GetTimeEntryByID(ctx context.Context, userID, timeEntryID string) (*timeblock.TimeEntry, error) {
	query := `
		SELECT id, clockify_id, user_id, date, start_time, end_time, task_id, task_name, project_id, project_name, goal_tag, description, created_at, updated_at
		FROM time_entries
		WHERE id = $1 AND user_id = $2
	`

	var te timeblock.TimeEntry
	var goalTag *string
	err := r.pool.QueryRow(ctx, query, timeEntryID, userID).Scan(
		&te.ID,
		&te.ClockifyID,
		&te.UserID,
		&te.Date,
		&te.StartTime,
		&te.EndTime,
		&te.TaskID,
		&te.TaskName,
		&te.ProjectID,
		&te.ProjectName,
		&goalTag,
		&te.Description,
		&te.CreatedAt,
		&te.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get time entry: %w", err)
	}

	if goalTag != nil {
		gt := timeblock.GoalTag(*goalTag)
		te.GoalTag = &gt
	}

	return &te, nil
}

// CreateTimeEntry creates a new time entry
func (r *PostgresRepository) CreateTimeEntry(ctx context.Context, userID string, input timeblock.CreateTimeEntryInput) (*timeblock.TimeEntry, error) {
	id := uuid.New().String()
	now := time.Now()

	var goalTag *string
	if input.GoalTag != nil {
		s := string(*input.GoalTag)
		goalTag = &s
	}

	query := `
		INSERT INTO time_entries (id, clockify_id, user_id, date, start_time, end_time, task_id, task_name, project_id, project_name, goal_tag, description, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		RETURNING id, clockify_id, user_id, date, start_time, end_time, task_id, task_name, project_id, project_name, goal_tag, description, created_at, updated_at
	`

	var te timeblock.TimeEntry
	var returnedGoalTag *string
	err := r.pool.QueryRow(ctx, query,
		id,
		input.ClockifyID,
		userID,
		input.Date,
		input.StartTime,
		input.EndTime,
		input.TaskID,
		input.TaskName,
		input.ProjectID,
		input.ProjectName,
		goalTag,
		input.Description,
		now,
		now,
	).Scan(
		&te.ID,
		&te.ClockifyID,
		&te.UserID,
		&te.Date,
		&te.StartTime,
		&te.EndTime,
		&te.TaskID,
		&te.TaskName,
		&te.ProjectID,
		&te.ProjectName,
		&returnedGoalTag,
		&te.Description,
		&te.CreatedAt,
		&te.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create time entry: %w", err)
	}

	if returnedGoalTag != nil {
		gt := timeblock.GoalTag(*returnedGoalTag)
		te.GoalTag = &gt
	}

	return &te, nil
}

// UpdateTimeEntry updates an existing time entry
func (r *PostgresRepository) UpdateTimeEntry(ctx context.Context, userID, timeEntryID string, input timeblock.UpdateTimeEntryInput) (*timeblock.TimeEntry, error) {
	var setClauses []string
	var args []interface{}
	argCount := 0

	if input.ClockifyID != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("clockify_id = $%d", argCount))
		args = append(args, *input.ClockifyID)
	}

	if input.Date != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("date = $%d", argCount))
		args = append(args, *input.Date)
	}

	if input.StartTime != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("start_time = $%d", argCount))
		args = append(args, *input.StartTime)
	}

	if input.EndTime != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("end_time = $%d", argCount))
		args = append(args, *input.EndTime)
	}

	if input.TaskID != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("task_id = $%d", argCount))
		args = append(args, *input.TaskID)
	}

	if input.TaskName != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("task_name = $%d", argCount))
		args = append(args, *input.TaskName)
	}

	if input.ProjectID != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("project_id = $%d", argCount))
		args = append(args, *input.ProjectID)
	}

	if input.ProjectName != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("project_name = $%d", argCount))
		args = append(args, *input.ProjectName)
	}

	if input.GoalTag != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("goal_tag = $%d", argCount))
		args = append(args, string(*input.GoalTag))
	}

	if input.Description != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("description = $%d", argCount))
		args = append(args, *input.Description)
	}

	if len(setClauses) == 0 {
		return r.GetTimeEntryByID(ctx, userID, timeEntryID)
	}

	argCount++
	setClauses = append(setClauses, fmt.Sprintf("updated_at = $%d", argCount))
	args = append(args, time.Now())

	argCount++
	args = append(args, timeEntryID)
	argCount++
	args = append(args, userID)

	query := fmt.Sprintf(`
		UPDATE time_entries
		SET %s
		WHERE id = $%d AND user_id = $%d
		RETURNING id, clockify_id, user_id, date, start_time, end_time, task_id, task_name, project_id, project_name, goal_tag, description, created_at, updated_at
	`, strings.Join(setClauses, ", "), argCount-1, argCount)

	var te timeblock.TimeEntry
	var goalTag *string
	err := r.pool.QueryRow(ctx, query, args...).Scan(
		&te.ID,
		&te.ClockifyID,
		&te.UserID,
		&te.Date,
		&te.StartTime,
		&te.EndTime,
		&te.TaskID,
		&te.TaskName,
		&te.ProjectID,
		&te.ProjectName,
		&goalTag,
		&te.Description,
		&te.CreatedAt,
		&te.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to update time entry: %w", err)
	}

	if goalTag != nil {
		gt := timeblock.GoalTag(*goalTag)
		te.GoalTag = &gt
	}

	return &te, nil
}

// DeleteTimeEntry deletes a time entry
func (r *PostgresRepository) DeleteTimeEntry(ctx context.Context, userID, timeEntryID string) error {
	query := `DELETE FROM time_entries WHERE id = $1 AND user_id = $2`
	result, err := r.pool.Exec(ctx, query, timeEntryID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete time entry: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("time entry not found")
	}

	return nil
}
