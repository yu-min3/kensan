package repository

import (
	"context"

	task "github.com/kensan/backend/services/task/internal"
)

// Repository defines the interface for task and project data access
type Repository interface {
	// Project Operations
	ListProjects(ctx context.Context, userID string, filter task.ProjectFilter) ([]task.Project, error)
	GetProjectByID(ctx context.Context, userID, projectID string) (*task.Project, error)
	CreateProject(ctx context.Context, userID string, input task.CreateProjectInput) (*task.Project, error)
	UpdateProject(ctx context.Context, userID, projectID string, input task.UpdateProjectInput) (*task.Project, error)
	DeleteProject(ctx context.Context, userID, projectID string) error

	// Task Operations
	ListTasks(ctx context.Context, userID string, filter task.TaskFilter) ([]task.Task, error)
	GetTaskByID(ctx context.Context, userID, taskID string) (*task.Task, error)
	CreateTask(ctx context.Context, userID string, input task.CreateTaskInput) (*task.Task, error)
	UpdateTask(ctx context.Context, userID, taskID string, input task.UpdateTaskInput) (*task.Task, error)
	DeleteTask(ctx context.Context, userID, taskID string) error
	GetChildTasks(ctx context.Context, userID, parentTaskID string) ([]task.Task, error)
	ToggleTaskComplete(ctx context.Context, userID, taskID string) (*task.Task, error)
}
