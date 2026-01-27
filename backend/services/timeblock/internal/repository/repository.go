package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kensan/backend/services/timeblock/internal"
	sharedErrors "github.com/kensan/backend/shared/errors"
)

// Repository-level errors
var (
	ErrTimerAlreadyRunning = errors.New("a timer is already running")
)

// PostgresRepository handles database operations for time blocks and time entries
type PostgresRepository struct {
	pool *pgxpool.Pool
}

// UpdateBuilder helps build dynamic UPDATE queries with optional fields
type UpdateBuilder struct {
	setClauses []string
	args       []interface{}
	argCount   int
}

// NewUpdateBuilder creates a new UpdateBuilder
func NewUpdateBuilder() *UpdateBuilder {
	return &UpdateBuilder{
		setClauses: []string{},
		args:       []interface{}{},
		argCount:   0,
	}
}

// AddField adds a field to the SET clause if the pointer is not nil
func AddField[T any](b *UpdateBuilder, fieldName string, ptr *T) {
	if ptr != nil {
		b.argCount++
		b.setClauses = append(b.setClauses, fmt.Sprintf("%s = $%d", fieldName, b.argCount))
		b.args = append(b.args, *ptr)
	}
}

// AddFieldValue adds a field with a direct value (not pointer) to the SET clause
func (b *UpdateBuilder) AddFieldValue(fieldName string, value interface{}) {
	b.argCount++
	b.setClauses = append(b.setClauses, fmt.Sprintf("%s = $%d", fieldName, b.argCount))
	b.args = append(b.args, value)
}

// AddArg adds an argument without a SET clause (for WHERE conditions)
func (b *UpdateBuilder) AddArg(value interface{}) int {
	b.argCount++
	b.args = append(b.args, value)
	return b.argCount
}

// HasUpdates returns true if any fields were added
func (b *UpdateBuilder) HasUpdates() bool {
	return len(b.setClauses) > 0
}

// SetClause returns the SET clause string
func (b *UpdateBuilder) SetClause() string {
	return strings.Join(b.setClauses, ", ")
}

// Args returns all arguments
func (b *UpdateBuilder) Args() []interface{} {
	return b.args
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
		SELECT id, user_id, date::text, start_time::text, end_time::text, task_id, task_name,
		       milestone_id, milestone_name, goal_id, goal_name, goal_color,
		       tag_ids, is_routine, routine_task_id, created_at, updated_at
		FROM time_blocks
		WHERE user_id = $1
	`
	args := []interface{}{userID}
	argCount := 1

	// UTC timestamp range filters take precedence over date filters
	if filter.StartTimestamp != nil && filter.EndTimestamp != nil {
		// Query using combined date + start_time as timestamp
		argCount++
		query += fmt.Sprintf(" AND (date + start_time) >= $%d::timestamp", argCount)
		args = append(args, *filter.StartTimestamp)
		argCount++
		query += fmt.Sprintf(" AND (date + start_time) < $%d::timestamp", argCount)
		args = append(args, *filter.EndTimestamp)
	} else {
		// Fall back to date-based filters
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
	}

	if filter.GoalID != nil {
		argCount++
		query += fmt.Sprintf(" AND goal_id = $%d", argCount)
		args = append(args, *filter.GoalID)
	}

	if filter.MilestoneID != nil {
		argCount++
		query += fmt.Sprintf(" AND milestone_id = $%d", argCount)
		args = append(args, *filter.MilestoneID)
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
		var tagIDs []string
		err := rows.Scan(
			&tb.ID,
			&tb.UserID,
			&tb.Date,
			&tb.StartTime,
			&tb.EndTime,
			&tb.TaskID,
			&tb.TaskName,
			&tb.MilestoneID,
			&tb.MilestoneName,
			&tb.GoalID,
			&tb.GoalName,
			&tb.GoalColor,
			&tagIDs,
			&tb.IsRoutine,
			&tb.RoutineTaskID,
			&tb.CreatedAt,
			&tb.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan time block: %w", err)
		}
		tb.TagIDs = tagIDs
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
		SELECT id, user_id, date::text, start_time::text, end_time::text, task_id, task_name,
		       milestone_id, milestone_name, goal_id, goal_name, goal_color,
		       tag_ids, is_routine, routine_task_id, created_at, updated_at
		FROM time_blocks
		WHERE id = $1 AND user_id = $2
	`

	var tb timeblock.TimeBlock
	var tagIDs []string
	err := r.pool.QueryRow(ctx, query, timeBlockID, userID).Scan(
		&tb.ID,
		&tb.UserID,
		&tb.Date,
		&tb.StartTime,
		&tb.EndTime,
		&tb.TaskID,
		&tb.TaskName,
		&tb.MilestoneID,
		&tb.MilestoneName,
		&tb.GoalID,
		&tb.GoalName,
		&tb.GoalColor,
		&tagIDs,
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

	tb.TagIDs = tagIDs

	return &tb, nil
}

// CreateTimeBlock creates a new time block
func (r *PostgresRepository) CreateTimeBlock(ctx context.Context, userID string, input timeblock.CreateTimeBlockInput) (*timeblock.TimeBlock, error) {
	id := uuid.New().String()
	now := time.Now()

	tagIDs := input.TagIDs
	if tagIDs == nil {
		tagIDs = []string{}
	}

	query := `
		INSERT INTO time_blocks (id, user_id, date, start_time, end_time, task_id, task_name,
		                         milestone_id, milestone_name,
		                         goal_id, goal_name, goal_color, tag_ids,
		                         is_routine, routine_task_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
		RETURNING id, user_id, date::text, start_time::text, end_time::text, task_id, task_name,
		          milestone_id, milestone_name, goal_id, goal_name, goal_color,
		          tag_ids, is_routine, routine_task_id, created_at, updated_at
	`

	var tb timeblock.TimeBlock
	var returnedTagIDs []string
	err := r.pool.QueryRow(ctx, query,
		id,
		userID,
		input.Date,
		input.StartTime,
		input.EndTime,
		input.TaskID,
		input.TaskName,
		input.MilestoneID,
		input.MilestoneName,
		input.GoalID,
		input.GoalName,
		input.GoalColor,
		tagIDs,
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
		&tb.MilestoneID,
		&tb.MilestoneName,
		&tb.GoalID,
		&tb.GoalName,
		&tb.GoalColor,
		&returnedTagIDs,
		&tb.IsRoutine,
		&tb.RoutineTaskID,
		&tb.CreatedAt,
		&tb.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create time block: %w", err)
	}

	tb.TagIDs = returnedTagIDs

	return &tb, nil
}

// UpdateTimeBlock updates an existing time block
func (r *PostgresRepository) UpdateTimeBlock(ctx context.Context, userID, timeBlockID string, input timeblock.UpdateTimeBlockInput) (*timeblock.TimeBlock, error) {
	b := NewUpdateBuilder()

	AddField(b, "date", input.Date)
	AddField(b, "start_time", input.StartTime)
	AddField(b, "end_time", input.EndTime)
	AddField(b, "task_id", input.TaskID)
	AddField(b, "task_name", input.TaskName)
	AddField(b, "milestone_id", input.MilestoneID)
	AddField(b, "milestone_name", input.MilestoneName)
	AddField(b, "goal_id", input.GoalID)
	AddField(b, "goal_name", input.GoalName)
	AddField(b, "goal_color", input.GoalColor)
	if input.TagIDs != nil {
		b.AddFieldValue("tag_ids", input.TagIDs)
	}
	AddField(b, "is_routine", input.IsRoutine)
	AddField(b, "routine_task_id", input.RoutineTaskID)

	if !b.HasUpdates() {
		return r.GetTimeBlockByID(ctx, userID, timeBlockID)
	}

	b.AddFieldValue("updated_at", time.Now())
	idArg := b.AddArg(timeBlockID)
	userArg := b.AddArg(userID)

	query := fmt.Sprintf(`
		UPDATE time_blocks
		SET %s
		WHERE id = $%d AND user_id = $%d
		RETURNING id, user_id, date::text, start_time::text, end_time::text, task_id, task_name,
		          milestone_id, milestone_name, goal_id, goal_name, goal_color,
		          tag_ids, is_routine, routine_task_id, created_at, updated_at
	`, b.SetClause(), idArg, userArg)

	var tb timeblock.TimeBlock
	var tagIDs []string
	err := r.pool.QueryRow(ctx, query, b.Args()...).Scan(
		&tb.ID,
		&tb.UserID,
		&tb.Date,
		&tb.StartTime,
		&tb.EndTime,
		&tb.TaskID,
		&tb.TaskName,
		&tb.MilestoneID,
		&tb.MilestoneName,
		&tb.GoalID,
		&tb.GoalName,
		&tb.GoalColor,
		&tagIDs,
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

	tb.TagIDs = tagIDs

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
		SELECT id, user_id, date::text, start_time::text, end_time::text, task_id, task_name,
		       milestone_id, milestone_name, goal_id, goal_name, goal_color,
		       tag_ids, description, created_at, updated_at
		FROM time_entries
		WHERE user_id = $1
	`
	args := []interface{}{userID}
	argCount := 1

	// UTC timestamp range filters take precedence over date filters
	if filter.StartTimestamp != nil && filter.EndTimestamp != nil {
		// Query using combined date + start_time as timestamp
		argCount++
		query += fmt.Sprintf(" AND (date + start_time) >= $%d::timestamp", argCount)
		args = append(args, *filter.StartTimestamp)
		argCount++
		query += fmt.Sprintf(" AND (date + start_time) < $%d::timestamp", argCount)
		args = append(args, *filter.EndTimestamp)
	} else {
		// Fall back to date-based filters
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
	}

	if filter.GoalID != nil {
		argCount++
		query += fmt.Sprintf(" AND goal_id = $%d", argCount)
		args = append(args, *filter.GoalID)
	}

	if filter.MilestoneID != nil {
		argCount++
		query += fmt.Sprintf(" AND milestone_id = $%d", argCount)
		args = append(args, *filter.MilestoneID)
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
		var tagIDs []string
		err := rows.Scan(
			&te.ID,
			&te.UserID,
			&te.Date,
			&te.StartTime,
			&te.EndTime,
			&te.TaskID,
			&te.TaskName,
			&te.MilestoneID,
			&te.MilestoneName,
			&te.GoalID,
			&te.GoalName,
			&te.GoalColor,
			&tagIDs,
			&te.Description,
			&te.CreatedAt,
			&te.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan time entry: %w", err)
		}
		te.TagIDs = tagIDs
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
		SELECT id, user_id, date::text, start_time::text, end_time::text, task_id, task_name,
		       milestone_id, milestone_name, goal_id, goal_name, goal_color,
		       tag_ids, description, created_at, updated_at
		FROM time_entries
		WHERE id = $1 AND user_id = $2
	`

	var te timeblock.TimeEntry
	var tagIDs []string
	err := r.pool.QueryRow(ctx, query, timeEntryID, userID).Scan(
		&te.ID,
		&te.UserID,
		&te.Date,
		&te.StartTime,
		&te.EndTime,
		&te.TaskID,
		&te.TaskName,
		&te.MilestoneID,
		&te.MilestoneName,
		&te.GoalID,
		&te.GoalName,
		&te.GoalColor,
		&tagIDs,
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

	te.TagIDs = tagIDs

	return &te, nil
}

// CreateTimeEntry creates a new time entry
func (r *PostgresRepository) CreateTimeEntry(ctx context.Context, userID string, input timeblock.CreateTimeEntryInput) (*timeblock.TimeEntry, error) {
	id := uuid.New().String()
	now := time.Now()

	tagIDs := input.TagIDs
	if tagIDs == nil {
		tagIDs = []string{}
	}

	query := `
		INSERT INTO time_entries (id, user_id, date, start_time, end_time, task_id, task_name,
		                          milestone_id, milestone_name,
		                          goal_id, goal_name, goal_color, tag_ids, description, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		RETURNING id, user_id, date::text, start_time::text, end_time::text, task_id, task_name,
		          milestone_id, milestone_name, goal_id, goal_name, goal_color,
		          tag_ids, description, created_at, updated_at
	`

	var te timeblock.TimeEntry
	var returnedTagIDs []string
	err := r.pool.QueryRow(ctx, query,
		id,
		userID,
		input.Date,
		input.StartTime,
		input.EndTime,
		input.TaskID,
		input.TaskName,
		input.MilestoneID,
		input.MilestoneName,
		input.GoalID,
		input.GoalName,
		input.GoalColor,
		tagIDs,
		input.Description,
		now,
		now,
	).Scan(
		&te.ID,
		&te.UserID,
		&te.Date,
		&te.StartTime,
		&te.EndTime,
		&te.TaskID,
		&te.TaskName,
		&te.MilestoneID,
		&te.MilestoneName,
		&te.GoalID,
		&te.GoalName,
		&te.GoalColor,
		&returnedTagIDs,
		&te.Description,
		&te.CreatedAt,
		&te.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create time entry: %w", err)
	}

	te.TagIDs = returnedTagIDs

	return &te, nil
}

// UpdateTimeEntry updates an existing time entry
func (r *PostgresRepository) UpdateTimeEntry(ctx context.Context, userID, timeEntryID string, input timeblock.UpdateTimeEntryInput) (*timeblock.TimeEntry, error) {
	b := NewUpdateBuilder()

	AddField(b, "date", input.Date)
	AddField(b, "start_time", input.StartTime)
	AddField(b, "end_time", input.EndTime)
	AddField(b, "task_id", input.TaskID)
	AddField(b, "task_name", input.TaskName)
	AddField(b, "milestone_id", input.MilestoneID)
	AddField(b, "milestone_name", input.MilestoneName)
	AddField(b, "goal_id", input.GoalID)
	AddField(b, "goal_name", input.GoalName)
	AddField(b, "goal_color", input.GoalColor)
	if input.TagIDs != nil {
		b.AddFieldValue("tag_ids", input.TagIDs)
	}
	AddField(b, "description", input.Description)

	if !b.HasUpdates() {
		return r.GetTimeEntryByID(ctx, userID, timeEntryID)
	}

	b.AddFieldValue("updated_at", time.Now())
	idArg := b.AddArg(timeEntryID)
	userArg := b.AddArg(userID)

	query := fmt.Sprintf(`
		UPDATE time_entries
		SET %s
		WHERE id = $%d AND user_id = $%d
		RETURNING id, user_id, date::text, start_time::text, end_time::text, task_id, task_name,
		          milestone_id, milestone_name, goal_id, goal_name, goal_color,
		          tag_ids, description, created_at, updated_at
	`, b.SetClause(), idArg, userArg)

	var te timeblock.TimeEntry
	var tagIDs []string
	err := r.pool.QueryRow(ctx, query, b.Args()...).Scan(
		&te.ID,
		&te.UserID,
		&te.Date,
		&te.StartTime,
		&te.EndTime,
		&te.TaskID,
		&te.TaskName,
		&te.MilestoneID,
		&te.MilestoneName,
		&te.GoalID,
		&te.GoalName,
		&te.GoalColor,
		&tagIDs,
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

	te.TagIDs = tagIDs

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

// ========== Timer Operations ==========

// GetRunningTimer returns the current running timer for a user
func (r *PostgresRepository) GetRunningTimer(ctx context.Context, userID string) (*timeblock.RunningTimer, error) {
	query := `
		SELECT id, user_id, task_id, task_name,
		       milestone_id, milestone_name, goal_id, goal_name, goal_color,
		       tag_ids, started_at, created_at
		FROM running_timers
		WHERE user_id = $1
	`

	var rt timeblock.RunningTimer
	var tagIDs []string
	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&rt.ID,
		&rt.UserID,
		&rt.TaskID,
		&rt.TaskName,
		&rt.MilestoneID,
		&rt.MilestoneName,
		&rt.GoalID,
		&rt.GoalName,
		&rt.GoalColor,
		&tagIDs,
		&rt.StartedAt,
		&rt.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get running timer: %w", err)
	}

	rt.TagIDs = tagIDs

	return &rt, nil
}

// StartTimer starts a new timer for a user
func (r *PostgresRepository) StartTimer(ctx context.Context, userID string, input timeblock.StartTimerInput) (*timeblock.RunningTimer, error) {
	id := uuid.New().String()
	now := time.Now()

	tagIDs := input.TagIDs
	if tagIDs == nil {
		tagIDs = []string{}
	}

	query := `
		INSERT INTO running_timers (id, user_id, task_id, task_name,
		                            milestone_id, milestone_name, goal_id, goal_name, goal_color,
		                            tag_ids, started_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, user_id, task_id, task_name,
		          milestone_id, milestone_name, goal_id, goal_name, goal_color,
		          tag_ids, started_at, created_at
	`

	var rt timeblock.RunningTimer
	var returnedTagIDs []string
	err := r.pool.QueryRow(ctx, query,
		id,
		userID,
		input.TaskID,
		input.TaskName,
		input.MilestoneID,
		input.MilestoneName,
		input.GoalID,
		input.GoalName,
		input.GoalColor,
		tagIDs,
		now,
		now,
	).Scan(
		&rt.ID,
		&rt.UserID,
		&rt.TaskID,
		&rt.TaskName,
		&rt.MilestoneID,
		&rt.MilestoneName,
		&rt.GoalID,
		&rt.GoalName,
		&rt.GoalColor,
		&returnedTagIDs,
		&rt.StartedAt,
		&rt.CreatedAt,
	)
	if err != nil {
		if sharedErrors.IsUniqueViolation(err) {
			return nil, ErrTimerAlreadyRunning
		}
		return nil, fmt.Errorf("failed to start timer: %w", err)
	}

	rt.TagIDs = returnedTagIDs

	return &rt, nil
}

// StopTimer stops the current timer and creates a time entry
func (r *PostgresRepository) StopTimer(ctx context.Context, userID string) (*timeblock.TimeEntry, error) {
	// Get the running timer first
	timer, err := r.GetRunningTimer(ctx, userID)
	if err != nil {
		return nil, err
	}
	if timer == nil {
		return nil, nil
	}

	now := time.Now()

	// Create time entry from the running timer
	entryID := uuid.New().String()
	startDate := timer.StartedAt.Format("2006-01-02")
	startTime := timer.StartedAt.Format("15:04")
	endDate := now.Format("2006-01-02")
	endTime := now.Format("15:04")

	tagIDs := timer.TagIDs
	if tagIDs == nil {
		tagIDs = []string{}
	}

	// Insert time entry
	insertQuery := `
		INSERT INTO time_entries (id, user_id, date, start_time, end_time, task_id, task_name,
		                          milestone_id, milestone_name,
		                          goal_id, goal_name, goal_color, tag_ids, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		RETURNING id, user_id, date::text, start_time::text, end_time::text, task_id, task_name,
		          milestone_id, milestone_name, goal_id, goal_name, goal_color,
		          tag_ids, description, created_at, updated_at
	`

	var te timeblock.TimeEntry
	var returnedTagIDs []string
	err = r.pool.QueryRow(ctx, insertQuery,
		entryID,
		userID,
		startDate,
		startTime,
		endTime,
		timer.TaskID,
		timer.TaskName,
		timer.MilestoneID,
		timer.MilestoneName,
		timer.GoalID,
		timer.GoalName,
		timer.GoalColor,
		tagIDs,
		now,
		now,
	).Scan(
		&te.ID,
		&te.UserID,
		&te.Date,
		&te.StartTime,
		&te.EndTime,
		&te.TaskID,
		&te.TaskName,
		&te.MilestoneID,
		&te.MilestoneName,
		&te.GoalID,
		&te.GoalName,
		&te.GoalColor,
		&returnedTagIDs,
		&te.Description,
		&te.CreatedAt,
		&te.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create time entry from timer: %w", err)
	}

	te.TagIDs = returnedTagIDs

	// Delete the running timer
	deleteQuery := `DELETE FROM running_timers WHERE user_id = $1`
	_, err = r.pool.Exec(ctx, deleteQuery, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to delete running timer: %w", err)
	}

	// Handle cross-midnight timers - use the end date if different from start date
	_ = endDate // The timer might span multiple days, but we store start date

	return &te, nil
}
