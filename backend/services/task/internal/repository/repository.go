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

// PostgresRepository handles database operations for projects and tasks
type PostgresRepository struct {
	pool *pgxpool.Pool
}

// Ensure PostgresRepository implements Repository interface
var _ Repository = (*PostgresRepository)(nil)

// NewPostgresRepository creates a new task repository
func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

// ========== Project Operations ==========

// ListProjects returns all projects for a user with optional filters
func (r *PostgresRepository) ListProjects(ctx context.Context, userID string, filter task.ProjectFilter) ([]task.Project, error) {
	query := `
		SELECT id, user_id, clockify_id, name, goal_tag, color, is_archived, created_at, updated_at
		FROM projects
		WHERE user_id = $1
	`
	args := []interface{}{userID}
	argCount := 1

	if filter.IsArchived != nil {
		argCount++
		query += fmt.Sprintf(" AND is_archived = $%d", argCount)
		args = append(args, *filter.IsArchived)
	}

	if filter.GoalTag != nil {
		argCount++
		query += fmt.Sprintf(" AND goal_tag = $%d", argCount)
		args = append(args, string(*filter.GoalTag))
	}

	query += " ORDER BY created_at DESC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query projects: %w", err)
	}
	defer rows.Close()

	var projects []task.Project
	for rows.Next() {
		var p task.Project
		var goalTag *string
		err := rows.Scan(
			&p.ID,
			&p.UserID,
			&p.ClockifyID,
			&p.Name,
			&goalTag,
			&p.Color,
			&p.IsArchived,
			&p.CreatedAt,
			&p.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan project: %w", err)
		}
		if goalTag != nil {
			gt := task.GoalTag(*goalTag)
			p.GoalTag = &gt
		}
		projects = append(projects, p)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating projects: %w", err)
	}

	return projects, nil
}

// GetProjectByID returns a project by ID for a specific user
func (r *PostgresRepository) GetProjectByID(ctx context.Context, userID, projectID string) (*task.Project, error) {
	query := `
		SELECT id, user_id, clockify_id, name, goal_tag, color, is_archived, created_at, updated_at
		FROM projects
		WHERE id = $1 AND user_id = $2
	`

	var p task.Project
	var goalTag *string
	err := r.pool.QueryRow(ctx, query, projectID, userID).Scan(
		&p.ID,
		&p.UserID,
		&p.ClockifyID,
		&p.Name,
		&goalTag,
		&p.Color,
		&p.IsArchived,
		&p.CreatedAt,
		&p.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get project: %w", err)
	}

	if goalTag != nil {
		gt := task.GoalTag(*goalTag)
		p.GoalTag = &gt
	}

	return &p, nil
}

// CreateProject creates a new project
func (r *PostgresRepository) CreateProject(ctx context.Context, userID string, input task.CreateProjectInput) (*task.Project, error) {
	id := uuid.New().String()
	now := time.Now()

	var goalTag *string
	if input.GoalTag != nil {
		s := string(*input.GoalTag)
		goalTag = &s
	}

	query := `
		INSERT INTO projects (id, user_id, clockify_id, name, goal_tag, color, is_archived, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, user_id, clockify_id, name, goal_tag, color, is_archived, created_at, updated_at
	`

	var p task.Project
	var returnedGoalTag *string
	err := r.pool.QueryRow(ctx, query,
		id,
		userID,
		input.ClockifyID,
		input.Name,
		goalTag,
		input.Color,
		input.IsArchived,
		now,
		now,
	).Scan(
		&p.ID,
		&p.UserID,
		&p.ClockifyID,
		&p.Name,
		&returnedGoalTag,
		&p.Color,
		&p.IsArchived,
		&p.CreatedAt,
		&p.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create project: %w", err)
	}

	if returnedGoalTag != nil {
		gt := task.GoalTag(*returnedGoalTag)
		p.GoalTag = &gt
	}

	return &p, nil
}

// UpdateProject updates an existing project
func (r *PostgresRepository) UpdateProject(ctx context.Context, userID, projectID string, input task.UpdateProjectInput) (*task.Project, error) {
	var setClauses []string
	var args []interface{}
	argCount := 0

	if input.Name != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("name = $%d", argCount))
		args = append(args, *input.Name)
	}

	if input.ClockifyID != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("clockify_id = $%d", argCount))
		args = append(args, *input.ClockifyID)
	}

	if input.GoalTag != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("goal_tag = $%d", argCount))
		args = append(args, string(*input.GoalTag))
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
		return r.GetProjectByID(ctx, userID, projectID)
	}

	argCount++
	setClauses = append(setClauses, fmt.Sprintf("updated_at = $%d", argCount))
	args = append(args, time.Now())

	argCount++
	args = append(args, projectID)
	argCount++
	args = append(args, userID)

	query := fmt.Sprintf(`
		UPDATE projects
		SET %s
		WHERE id = $%d AND user_id = $%d
		RETURNING id, user_id, clockify_id, name, goal_tag, color, is_archived, created_at, updated_at
	`, strings.Join(setClauses, ", "), argCount-1, argCount)

	var p task.Project
	var goalTag *string
	err := r.pool.QueryRow(ctx, query, args...).Scan(
		&p.ID,
		&p.UserID,
		&p.ClockifyID,
		&p.Name,
		&goalTag,
		&p.Color,
		&p.IsArchived,
		&p.CreatedAt,
		&p.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to update project: %w", err)
	}

	if goalTag != nil {
		gt := task.GoalTag(*goalTag)
		p.GoalTag = &gt
	}

	return &p, nil
}

// DeleteProject deletes a project
func (r *PostgresRepository) DeleteProject(ctx context.Context, userID, projectID string) error {
	query := `DELETE FROM projects WHERE id = $1 AND user_id = $2`
	result, err := r.pool.Exec(ctx, query, projectID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete project: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("project not found")
	}

	return nil
}

// ========== Task Operations ==========

// ListTasks returns all tasks for a user with optional filters
func (r *PostgresRepository) ListTasks(ctx context.Context, userID string, filter task.TaskFilter) ([]task.Task, error) {
	query := `
		SELECT id, user_id, project_id, clockify_id, parent_task_id, name, goal_tag, estimated_minutes, completed, due_date, created_at, updated_at
		FROM tasks
		WHERE user_id = $1
	`
	args := []interface{}{userID}
	argCount := 1

	if filter.ProjectID != nil {
		argCount++
		query += fmt.Sprintf(" AND project_id = $%d", argCount)
		args = append(args, *filter.ProjectID)
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
		var goalTag *string
		err := rows.Scan(
			&t.ID,
			&t.UserID,
			&t.ProjectID,
			&t.ClockifyID,
			&t.ParentTaskID,
			&t.Name,
			&goalTag,
			&t.EstimatedMinutes,
			&t.Completed,
			&t.DueDate,
			&t.CreatedAt,
			&t.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan task: %w", err)
		}
		if goalTag != nil {
			gt := task.GoalTag(*goalTag)
			t.GoalTag = &gt
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
		SELECT id, user_id, project_id, clockify_id, parent_task_id, name, goal_tag, estimated_minutes, completed, due_date, created_at, updated_at
		FROM tasks
		WHERE id = $1 AND user_id = $2
	`

	var t task.Task
	var goalTag *string
	err := r.pool.QueryRow(ctx, query, taskID, userID).Scan(
		&t.ID,
		&t.UserID,
		&t.ProjectID,
		&t.ClockifyID,
		&t.ParentTaskID,
		&t.Name,
		&goalTag,
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

	if goalTag != nil {
		gt := task.GoalTag(*goalTag)
		t.GoalTag = &gt
	}

	return &t, nil
}

// CreateTask creates a new task
func (r *PostgresRepository) CreateTask(ctx context.Context, userID string, input task.CreateTaskInput) (*task.Task, error) {
	id := uuid.New().String()
	now := time.Now()

	var goalTag *string
	if input.GoalTag != nil {
		s := string(*input.GoalTag)
		goalTag = &s
	}

	query := `
		INSERT INTO tasks (id, user_id, project_id, clockify_id, parent_task_id, name, goal_tag, estimated_minutes, completed, due_date, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, user_id, project_id, clockify_id, parent_task_id, name, goal_tag, estimated_minutes, completed, due_date, created_at, updated_at
	`

	var t task.Task
	var returnedGoalTag *string
	err := r.pool.QueryRow(ctx, query,
		id,
		userID,
		input.ProjectID,
		input.ClockifyID,
		input.ParentTaskID,
		input.Name,
		goalTag,
		input.EstimatedMinutes,
		input.Completed,
		input.DueDate,
		now,
		now,
	).Scan(
		&t.ID,
		&t.UserID,
		&t.ProjectID,
		&t.ClockifyID,
		&t.ParentTaskID,
		&t.Name,
		&returnedGoalTag,
		&t.EstimatedMinutes,
		&t.Completed,
		&t.DueDate,
		&t.CreatedAt,
		&t.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create task: %w", err)
	}

	if returnedGoalTag != nil {
		gt := task.GoalTag(*returnedGoalTag)
		t.GoalTag = &gt
	}

	return &t, nil
}

// UpdateTask updates an existing task
func (r *PostgresRepository) UpdateTask(ctx context.Context, userID, taskID string, input task.UpdateTaskInput) (*task.Task, error) {
	var setClauses []string
	var args []interface{}
	argCount := 0

	if input.ProjectID != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("project_id = $%d", argCount))
		args = append(args, *input.ProjectID)
	}

	if input.ClockifyID != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("clockify_id = $%d", argCount))
		args = append(args, *input.ClockifyID)
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

	if input.GoalTag != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("goal_tag = $%d", argCount))
		args = append(args, string(*input.GoalTag))
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
		RETURNING id, user_id, project_id, clockify_id, parent_task_id, name, goal_tag, estimated_minutes, completed, due_date, created_at, updated_at
	`, strings.Join(setClauses, ", "), argCount-1, argCount)

	var t task.Task
	var goalTag *string
	err := r.pool.QueryRow(ctx, query, args...).Scan(
		&t.ID,
		&t.UserID,
		&t.ProjectID,
		&t.ClockifyID,
		&t.ParentTaskID,
		&t.Name,
		&goalTag,
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

	if goalTag != nil {
		gt := task.GoalTag(*goalTag)
		t.GoalTag = &gt
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
		SELECT id, user_id, project_id, clockify_id, parent_task_id, name, goal_tag, estimated_minutes, completed, due_date, created_at, updated_at
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
		var goalTag *string
		err := rows.Scan(
			&t.ID,
			&t.UserID,
			&t.ProjectID,
			&t.ClockifyID,
			&t.ParentTaskID,
			&t.Name,
			&goalTag,
			&t.EstimatedMinutes,
			&t.Completed,
			&t.DueDate,
			&t.CreatedAt,
			&t.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan child task: %w", err)
		}
		if goalTag != nil {
			gt := task.GoalTag(*goalTag)
			t.GoalTag = &gt
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
		RETURNING id, user_id, project_id, clockify_id, parent_task_id, name, goal_tag, estimated_minutes, completed, due_date, created_at, updated_at
	`

	var t task.Task
	var goalTag *string
	err := r.pool.QueryRow(ctx, query, taskID, userID, time.Now()).Scan(
		&t.ID,
		&t.UserID,
		&t.ProjectID,
		&t.ClockifyID,
		&t.ParentTaskID,
		&t.Name,
		&goalTag,
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

	if goalTag != nil {
		gt := task.GoalTag(*goalTag)
		t.GoalTag = &gt
	}

	return &t, nil
}
