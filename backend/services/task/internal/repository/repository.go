package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kensan/backend/services/task/internal"
)

// PostgresRepository handles database operations for tasks, goals, milestones, and tags
type PostgresRepository struct {
	pool *pgxpool.Pool
}

// Ensure PostgresRepository implements Repository interface
var _ Repository = (*PostgresRepository)(nil)

// NewPostgresRepository creates a new task repository
func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

// ========== Task Operations ==========

// ListTasks returns all tasks for a user with optional filters
func (r *PostgresRepository) ListTasks(ctx context.Context, userID string, filter task.TaskFilter) ([]task.Task, error) {
	query := `
		SELECT id, user_id, milestone_id, parent_task_id, name, estimated_minutes, completed, due_date, created_at, updated_at
		FROM tasks
		WHERE user_id = $1
	`
	args := []interface{}{userID}
	argCount := 1

	if filter.MilestoneID != nil {
		argCount++
		query += fmt.Sprintf(" AND milestone_id = $%d", argCount)
		args = append(args, *filter.MilestoneID)
	}

	if filter.Completed != nil {
		argCount++
		query += fmt.Sprintf(" AND completed = $%d", argCount)
		args = append(args, *filter.Completed)
	}

	if filter.ParentTaskID != nil {
		argCount++
		query += fmt.Sprintf(" AND parent_task_id = $%d", argCount)
		args = append(args, *filter.ParentTaskID)
	}

	if filter.HasParent != nil {
		if *filter.HasParent {
			query += " AND parent_task_id IS NOT NULL"
		} else {
			query += " AND parent_task_id IS NULL"
		}
	}

	query += " ORDER BY created_at DESC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query tasks: %w", err)
	}
	defer rows.Close()

	var tasks []task.Task
	for rows.Next() {
		var t task.Task
		err := rows.Scan(
			&t.ID,
			&t.UserID,
			&t.MilestoneID,
			&t.ParentTaskID,
			&t.Name,
			&t.EstimatedMinutes,
			&t.Completed,
			&t.DueDate,
			&t.CreatedAt,
			&t.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan task: %w", err)
		}
		tasks = append(tasks, t)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating tasks: %w", err)
	}

	return tasks, nil
}

// GetTaskByID returns a task by ID for a specific user
func (r *PostgresRepository) GetTaskByID(ctx context.Context, userID, taskID string) (*task.Task, error) {
	query := `
		SELECT id, user_id, milestone_id, parent_task_id, name, estimated_minutes, completed, due_date, created_at, updated_at
		FROM tasks
		WHERE id = $1 AND user_id = $2
	`

	var t task.Task
	err := r.pool.QueryRow(ctx, query, taskID, userID).Scan(
		&t.ID,
		&t.UserID,
		&t.MilestoneID,
		&t.ParentTaskID,
		&t.Name,
		&t.EstimatedMinutes,
		&t.Completed,
		&t.DueDate,
		&t.CreatedAt,
		&t.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get task: %w", err)
	}

	return &t, nil
}

// CreateTask creates a new task
func (r *PostgresRepository) CreateTask(ctx context.Context, userID string, input task.CreateTaskInput) (*task.Task, error) {
	id := uuid.New().String()
	now := time.Now()

	query := `
		INSERT INTO tasks (id, user_id, milestone_id, parent_task_id, name, estimated_minutes, completed, due_date, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, user_id, milestone_id, parent_task_id, name, estimated_minutes, completed, due_date, created_at, updated_at
	`

	var t task.Task
	err := r.pool.QueryRow(ctx, query,
		id,
		userID,
		input.MilestoneID,
		input.ParentTaskID,
		input.Name,
		input.EstimatedMinutes,
		input.Completed,
		input.DueDate,
		now,
		now,
	).Scan(
		&t.ID,
		&t.UserID,
		&t.MilestoneID,
		&t.ParentTaskID,
		&t.Name,
		&t.EstimatedMinutes,
		&t.Completed,
		&t.DueDate,
		&t.CreatedAt,
		&t.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create task: %w", err)
	}

	return &t, nil
}

// UpdateTask updates an existing task
func (r *PostgresRepository) UpdateTask(ctx context.Context, userID, taskID string, input task.UpdateTaskInput) (*task.Task, error) {
	var setClauses []string
	var args []interface{}
	argCount := 0

	if input.MilestoneID != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("milestone_id = $%d", argCount))
		args = append(args, *input.MilestoneID)
	}

	if input.ParentTaskID != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("parent_task_id = $%d", argCount))
		args = append(args, *input.ParentTaskID)
	}

	if input.Name != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("name = $%d", argCount))
		args = append(args, *input.Name)
	}

	if input.EstimatedMinutes != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("estimated_minutes = $%d", argCount))
		args = append(args, *input.EstimatedMinutes)
	}

	if input.Completed != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("completed = $%d", argCount))
		args = append(args, *input.Completed)
	}

	if input.DueDate != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("due_date = $%d", argCount))
		args = append(args, *input.DueDate)
	}

	if len(setClauses) == 0 {
		return r.GetTaskByID(ctx, userID, taskID)
	}

	argCount++
	setClauses = append(setClauses, fmt.Sprintf("updated_at = $%d", argCount))
	args = append(args, time.Now())

	argCount++
	args = append(args, taskID)
	argCount++
	args = append(args, userID)

	query := fmt.Sprintf(`
		UPDATE tasks
		SET %s
		WHERE id = $%d AND user_id = $%d
		RETURNING id, user_id, milestone_id, parent_task_id, name, estimated_minutes, completed, due_date, created_at, updated_at
	`, strings.Join(setClauses, ", "), argCount-1, argCount)

	var t task.Task
	err := r.pool.QueryRow(ctx, query, args...).Scan(
		&t.ID,
		&t.UserID,
		&t.MilestoneID,
		&t.ParentTaskID,
		&t.Name,
		&t.EstimatedMinutes,
		&t.Completed,
		&t.DueDate,
		&t.CreatedAt,
		&t.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to update task: %w", err)
	}

	return &t, nil
}

// DeleteTask deletes a task
func (r *PostgresRepository) DeleteTask(ctx context.Context, userID, taskID string) error {
	query := `DELETE FROM tasks WHERE id = $1 AND user_id = $2`
	result, err := r.pool.Exec(ctx, query, taskID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete task: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("task not found")
	}

	return nil
}

// GetChildTasks returns all child tasks for a given parent task
func (r *PostgresRepository) GetChildTasks(ctx context.Context, userID, parentTaskID string) ([]task.Task, error) {
	query := `
		SELECT id, user_id, milestone_id, parent_task_id, name, estimated_minutes, completed, due_date, created_at, updated_at
		FROM tasks
		WHERE user_id = $1 AND parent_task_id = $2
		ORDER BY created_at DESC
	`

	rows, err := r.pool.Query(ctx, query, userID, parentTaskID)
	if err != nil {
		return nil, fmt.Errorf("failed to query child tasks: %w", err)
	}
	defer rows.Close()

	var tasks []task.Task
	for rows.Next() {
		var t task.Task
		err := rows.Scan(
			&t.ID,
			&t.UserID,
			&t.MilestoneID,
			&t.ParentTaskID,
			&t.Name,
			&t.EstimatedMinutes,
			&t.Completed,
			&t.DueDate,
			&t.CreatedAt,
			&t.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan child task: %w", err)
		}
		tasks = append(tasks, t)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating child tasks: %w", err)
	}

	return tasks, nil
}

// ToggleTaskComplete toggles the completed status of a task
func (r *PostgresRepository) ToggleTaskComplete(ctx context.Context, userID, taskID string) (*task.Task, error) {
	query := `
		UPDATE tasks
		SET completed = NOT completed, updated_at = $3
		WHERE id = $1 AND user_id = $2
		RETURNING id, user_id, milestone_id, parent_task_id, name, estimated_minutes, completed, due_date, created_at, updated_at
	`

	var t task.Task
	err := r.pool.QueryRow(ctx, query, taskID, userID, time.Now()).Scan(
		&t.ID,
		&t.UserID,
		&t.MilestoneID,
		&t.ParentTaskID,
		&t.Name,
		&t.EstimatedMinutes,
		&t.Completed,
		&t.DueDate,
		&t.CreatedAt,
		&t.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to toggle task complete: %w", err)
	}

	return &t, nil
}

// ========== Goal Operations ==========

// ListGoals returns all goals for a user with optional filters
func (r *PostgresRepository) ListGoals(ctx context.Context, userID string, filter task.GoalFilter) ([]task.Goal, error) {
	query := `
		SELECT id, user_id, name, description, color, is_archived, created_at, updated_at
		FROM goals
		WHERE user_id = $1
	`
	args := []interface{}{userID}
	argCount := 1

	if filter.IsArchived != nil {
		argCount++
		query += fmt.Sprintf(" AND is_archived = $%d", argCount)
		args = append(args, *filter.IsArchived)
	}

	query += " ORDER BY created_at DESC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query goals: %w", err)
	}
	defer rows.Close()

	var goals []task.Goal
	for rows.Next() {
		var g task.Goal
		err := rows.Scan(&g.ID, &g.UserID, &g.Name, &g.Description, &g.Color, &g.IsArchived, &g.CreatedAt, &g.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan goal: %w", err)
		}
		goals = append(goals, g)
	}

	return goals, rows.Err()
}

// GetGoalByID returns a goal by ID
func (r *PostgresRepository) GetGoalByID(ctx context.Context, userID, goalID string) (*task.Goal, error) {
	query := `
		SELECT id, user_id, name, description, color, is_archived, created_at, updated_at
		FROM goals
		WHERE id = $1 AND user_id = $2
	`

	var g task.Goal
	err := r.pool.QueryRow(ctx, query, goalID, userID).Scan(
		&g.ID, &g.UserID, &g.Name, &g.Description, &g.Color, &g.IsArchived, &g.CreatedAt, &g.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get goal: %w", err)
	}

	return &g, nil
}

// CreateGoal creates a new goal
func (r *PostgresRepository) CreateGoal(ctx context.Context, userID string, input task.CreateGoalInput) (*task.Goal, error) {
	id := uuid.New().String()
	now := time.Now()

	query := `
		INSERT INTO goals (id, user_id, name, description, color, is_archived, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, FALSE, $6, $7)
		RETURNING id, user_id, name, description, color, is_archived, created_at, updated_at
	`

	var g task.Goal
	err := r.pool.QueryRow(ctx, query, id, userID, input.Name, input.Description, input.Color, now, now).Scan(
		&g.ID, &g.UserID, &g.Name, &g.Description, &g.Color, &g.IsArchived, &g.CreatedAt, &g.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create goal: %w", err)
	}

	return &g, nil
}

// UpdateGoal updates an existing goal
func (r *PostgresRepository) UpdateGoal(ctx context.Context, userID, goalID string, input task.UpdateGoalInput) (*task.Goal, error) {
	var setClauses []string
	var args []interface{}
	argCount := 0

	if input.Name != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("name = $%d", argCount))
		args = append(args, *input.Name)
	}
	if input.Description != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("description = $%d", argCount))
		args = append(args, *input.Description)
	}
	if input.Color != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("color = $%d", argCount))
		args = append(args, *input.Color)
	}
	if input.IsArchived != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("is_archived = $%d", argCount))
		args = append(args, *input.IsArchived)
	}

	if len(setClauses) == 0 {
		return r.GetGoalByID(ctx, userID, goalID)
	}

	argCount++
	setClauses = append(setClauses, fmt.Sprintf("updated_at = $%d", argCount))
	args = append(args, time.Now())

	argCount++
	args = append(args, goalID)
	argCount++
	args = append(args, userID)

	query := fmt.Sprintf(`
		UPDATE goals SET %s WHERE id = $%d AND user_id = $%d
		RETURNING id, user_id, name, description, color, is_archived, created_at, updated_at
	`, strings.Join(setClauses, ", "), argCount-1, argCount)

	var g task.Goal
	err := r.pool.QueryRow(ctx, query, args...).Scan(
		&g.ID, &g.UserID, &g.Name, &g.Description, &g.Color, &g.IsArchived, &g.CreatedAt, &g.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to update goal: %w", err)
	}

	return &g, nil
}

// DeleteGoal deletes a goal
func (r *PostgresRepository) DeleteGoal(ctx context.Context, userID, goalID string) error {
	query := `DELETE FROM goals WHERE id = $1 AND user_id = $2`
	result, err := r.pool.Exec(ctx, query, goalID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete goal: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("goal not found")
	}
	return nil
}

// ========== Milestone Operations ==========

// ListMilestones returns all milestones for a user with optional filters
func (r *PostgresRepository) ListMilestones(ctx context.Context, userID string, filter task.MilestoneFilter) ([]task.Milestone, error) {
	query := `
		SELECT id, user_id, goal_id, name, description, target_date, status, created_at, updated_at
		FROM milestones
		WHERE user_id = $1
	`
	args := []interface{}{userID}
	argCount := 1

	if filter.GoalID != nil {
		argCount++
		query += fmt.Sprintf(" AND goal_id = $%d", argCount)
		args = append(args, *filter.GoalID)
	}
	if filter.Status != nil {
		argCount++
		query += fmt.Sprintf(" AND status = $%d", argCount)
		args = append(args, string(*filter.Status))
	}

	query += " ORDER BY created_at DESC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query milestones: %w", err)
	}
	defer rows.Close()

	var milestones []task.Milestone
	for rows.Next() {
		var m task.Milestone
		var status string
		err := rows.Scan(&m.ID, &m.UserID, &m.GoalID, &m.Name, &m.Description, &m.TargetDate, &status, &m.CreatedAt, &m.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan milestone: %w", err)
		}
		m.Status = task.MilestoneStatus(status)
		milestones = append(milestones, m)
	}

	return milestones, rows.Err()
}

// GetMilestoneByID returns a milestone by ID
func (r *PostgresRepository) GetMilestoneByID(ctx context.Context, userID, milestoneID string) (*task.Milestone, error) {
	query := `
		SELECT id, user_id, goal_id, name, description, target_date, status, created_at, updated_at
		FROM milestones
		WHERE id = $1 AND user_id = $2
	`

	var m task.Milestone
	var status string
	err := r.pool.QueryRow(ctx, query, milestoneID, userID).Scan(
		&m.ID, &m.UserID, &m.GoalID, &m.Name, &m.Description, &m.TargetDate, &status, &m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get milestone: %w", err)
	}
	m.Status = task.MilestoneStatus(status)

	return &m, nil
}

// CreateMilestone creates a new milestone
func (r *PostgresRepository) CreateMilestone(ctx context.Context, userID string, input task.CreateMilestoneInput) (*task.Milestone, error) {
	id := uuid.New().String()
	now := time.Now()

	query := `
		INSERT INTO milestones (id, user_id, goal_id, name, description, target_date, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8)
		RETURNING id, user_id, goal_id, name, description, target_date, status, created_at, updated_at
	`

	var m task.Milestone
	var status string
	err := r.pool.QueryRow(ctx, query, id, userID, input.GoalID, input.Name, input.Description, input.TargetDate, now, now).Scan(
		&m.ID, &m.UserID, &m.GoalID, &m.Name, &m.Description, &m.TargetDate, &status, &m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create milestone: %w", err)
	}
	m.Status = task.MilestoneStatus(status)

	return &m, nil
}

// UpdateMilestone updates an existing milestone
func (r *PostgresRepository) UpdateMilestone(ctx context.Context, userID, milestoneID string, input task.UpdateMilestoneInput) (*task.Milestone, error) {
	var setClauses []string
	var args []interface{}
	argCount := 0

	if input.GoalID != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("goal_id = $%d", argCount))
		args = append(args, *input.GoalID)
	}
	if input.Name != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("name = $%d", argCount))
		args = append(args, *input.Name)
	}
	if input.Description != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("description = $%d", argCount))
		args = append(args, *input.Description)
	}
	if input.TargetDate != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("target_date = $%d", argCount))
		args = append(args, *input.TargetDate)
	}
	if input.Status != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("status = $%d", argCount))
		args = append(args, string(*input.Status))
	}

	if len(setClauses) == 0 {
		return r.GetMilestoneByID(ctx, userID, milestoneID)
	}

	argCount++
	setClauses = append(setClauses, fmt.Sprintf("updated_at = $%d", argCount))
	args = append(args, time.Now())

	argCount++
	args = append(args, milestoneID)
	argCount++
	args = append(args, userID)

	query := fmt.Sprintf(`
		UPDATE milestones SET %s WHERE id = $%d AND user_id = $%d
		RETURNING id, user_id, goal_id, name, description, target_date, status, created_at, updated_at
	`, strings.Join(setClauses, ", "), argCount-1, argCount)

	var m task.Milestone
	var status string
	err := r.pool.QueryRow(ctx, query, args...).Scan(
		&m.ID, &m.UserID, &m.GoalID, &m.Name, &m.Description, &m.TargetDate, &status, &m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to update milestone: %w", err)
	}
	m.Status = task.MilestoneStatus(status)

	return &m, nil
}

// DeleteMilestone deletes a milestone
func (r *PostgresRepository) DeleteMilestone(ctx context.Context, userID, milestoneID string) error {
	query := `DELETE FROM milestones WHERE id = $1 AND user_id = $2`
	result, err := r.pool.Exec(ctx, query, milestoneID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete milestone: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("milestone not found")
	}
	return nil
}

// ========== Tag Operations ==========

// ListTags returns all tags for a user
func (r *PostgresRepository) ListTags(ctx context.Context, userID string) ([]task.Tag, error) {
	query := `
		SELECT id, user_id, name, color, created_at
		FROM tags
		WHERE user_id = $1
		ORDER BY name ASC
	`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query tags: %w", err)
	}
	defer rows.Close()

	var tags []task.Tag
	for rows.Next() {
		var t task.Tag
		err := rows.Scan(&t.ID, &t.UserID, &t.Name, &t.Color, &t.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan tag: %w", err)
		}
		tags = append(tags, t)
	}

	return tags, rows.Err()
}

// GetTagByID returns a tag by ID
func (r *PostgresRepository) GetTagByID(ctx context.Context, userID, tagID string) (*task.Tag, error) {
	query := `
		SELECT id, user_id, name, color, created_at
		FROM tags
		WHERE id = $1 AND user_id = $2
	`

	var t task.Tag
	err := r.pool.QueryRow(ctx, query, tagID, userID).Scan(&t.ID, &t.UserID, &t.Name, &t.Color, &t.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get tag: %w", err)
	}

	return &t, nil
}

// CreateTag creates a new tag
func (r *PostgresRepository) CreateTag(ctx context.Context, userID string, input task.CreateTagInput) (*task.Tag, error) {
	id := uuid.New().String()
	now := time.Now()

	query := `
		INSERT INTO tags (id, user_id, name, color, created_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, user_id, name, color, created_at
	`

	var t task.Tag
	err := r.pool.QueryRow(ctx, query, id, userID, input.Name, input.Color, now).Scan(
		&t.ID, &t.UserID, &t.Name, &t.Color, &t.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create tag: %w", err)
	}

	return &t, nil
}

// UpdateTag updates an existing tag
func (r *PostgresRepository) UpdateTag(ctx context.Context, userID, tagID string, input task.UpdateTagInput) (*task.Tag, error) {
	var setClauses []string
	var args []interface{}
	argCount := 0

	if input.Name != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("name = $%d", argCount))
		args = append(args, *input.Name)
	}
	if input.Color != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("color = $%d", argCount))
		args = append(args, *input.Color)
	}

	if len(setClauses) == 0 {
		return r.GetTagByID(ctx, userID, tagID)
	}

	argCount++
	args = append(args, tagID)
	argCount++
	args = append(args, userID)

	query := fmt.Sprintf(`
		UPDATE tags SET %s WHERE id = $%d AND user_id = $%d
		RETURNING id, user_id, name, color, created_at
	`, strings.Join(setClauses, ", "), argCount-1, argCount)

	var t task.Tag
	err := r.pool.QueryRow(ctx, query, args...).Scan(&t.ID, &t.UserID, &t.Name, &t.Color, &t.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to update tag: %w", err)
	}

	return &t, nil
}

// DeleteTag deletes a tag
func (r *PostgresRepository) DeleteTag(ctx context.Context, userID, tagID string) error {
	query := `DELETE FROM tags WHERE id = $1 AND user_id = $2`
	result, err := r.pool.Exec(ctx, query, tagID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete tag: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("tag not found")
	}
	return nil
}

// ========== Task-Tag Operations ==========

// GetTaskTags returns all tag IDs for a task
func (r *PostgresRepository) GetTaskTags(ctx context.Context, taskID string) ([]string, error) {
	query := `SELECT tag_id FROM task_tags WHERE task_id = $1`

	rows, err := r.pool.Query(ctx, query, taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to query task tags: %w", err)
	}
	defer rows.Close()

	var tagIDs []string
	for rows.Next() {
		var tagID string
		if err := rows.Scan(&tagID); err != nil {
			return nil, fmt.Errorf("failed to scan tag ID: %w", err)
		}
		tagIDs = append(tagIDs, tagID)
	}

	return tagIDs, rows.Err()
}

// SetTaskTags sets the tags for a task (replaces existing)
func (r *PostgresRepository) SetTaskTags(ctx context.Context, taskID string, tagIDs []string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Delete existing tags
	_, err = tx.Exec(ctx, `DELETE FROM task_tags WHERE task_id = $1`, taskID)
	if err != nil {
		return fmt.Errorf("failed to delete existing task tags: %w", err)
	}

	// Insert new tags
	for _, tagID := range tagIDs {
		_, err = tx.Exec(ctx, `INSERT INTO task_tags (task_id, tag_id) VALUES ($1, $2)`, taskID, tagID)
		if err != nil {
			return fmt.Errorf("failed to insert task tag: %w", err)
		}
	}

	return tx.Commit(ctx)
}
