package service

import (
	"context"
	"errors"

	"github.com/kensan/backend/services/task/internal"
	"github.com/kensan/backend/services/task/internal/repository"
)

var (
	ErrProjectNotFound = errors.New("project not found")
	ErrTaskNotFound    = errors.New("task not found")
	ErrInvalidGoalTag  = errors.New("invalid goal tag")
	ErrInvalidInput    = errors.New("invalid input")
)

// Service handles business logic for projects and tasks
type Service struct {
	repo repository.Repository
}

// NewService creates a new task service
func NewService(repo repository.Repository) *Service {
	return &Service{repo: repo}
}

// ========== Project Operations ==========

// ListProjects returns all projects for a user with optional filters
func (s *Service) ListProjects(ctx context.Context, userID string, filter task.ProjectFilter) ([]task.Project, error) {
	if filter.GoalTag != nil && !filter.GoalTag.IsValid() {
		return nil, ErrInvalidGoalTag
	}

	projects, err := s.repo.ListProjects(ctx, userID, filter)
	if err != nil {
		return nil, err
	}

	if projects == nil {
		return []task.Project{}, nil
	}

	return projects, nil
}

// GetProject returns a project by ID
func (s *Service) GetProject(ctx context.Context, userID, projectID string) (*task.Project, error) {
	project, err := s.repo.GetProjectByID(ctx, userID, projectID)
	if err != nil {
		return nil, err
	}

	if project == nil {
		return nil, ErrProjectNotFound
	}

	return project, nil
}

// CreateProject creates a new project
func (s *Service) CreateProject(ctx context.Context, userID string, input task.CreateProjectInput) (*task.Project, error) {
	if input.Name == "" {
		return nil, ErrInvalidInput
	}

	if input.GoalTag != nil && !input.GoalTag.IsValid() {
		return nil, ErrInvalidGoalTag
	}

	return s.repo.CreateProject(ctx, userID, input)
}

// UpdateProject updates an existing project
func (s *Service) UpdateProject(ctx context.Context, userID, projectID string, input task.UpdateProjectInput) (*task.Project, error) {
	// Check if project exists and belongs to user
	existing, err := s.repo.GetProjectByID(ctx, userID, projectID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, ErrProjectNotFound
	}

	if input.GoalTag != nil && !input.GoalTag.IsValid() {
		return nil, ErrInvalidGoalTag
	}

	project, err := s.repo.UpdateProject(ctx, userID, projectID, input)
	if err != nil {
		return nil, err
	}

	if project == nil {
		return nil, ErrProjectNotFound
	}

	return project, nil
}

// DeleteProject deletes a project
func (s *Service) DeleteProject(ctx context.Context, userID, projectID string) error {
	// Check if project exists and belongs to user
	existing, err := s.repo.GetProjectByID(ctx, userID, projectID)
	if err != nil {
		return err
	}
	if existing == nil {
		return ErrProjectNotFound
	}

	return s.repo.DeleteProject(ctx, userID, projectID)
}

// ========== Task Operations ==========

// ListTasks returns all tasks for a user with optional filters
func (s *Service) ListTasks(ctx context.Context, userID string, filter task.TaskFilter) ([]task.Task, error) {
	// If project_id is specified, verify it belongs to the user
	if filter.ProjectID != nil {
		project, err := s.repo.GetProjectByID(ctx, userID, *filter.ProjectID)
		if err != nil {
			return nil, err
		}
		if project == nil {
			return nil, ErrProjectNotFound
		}
	}

	// If parent_id is specified, verify it belongs to the user
	if filter.ParentTaskID != nil {
		parentTask, err := s.repo.GetTaskByID(ctx, userID, *filter.ParentTaskID)
		if err != nil {
			return nil, err
		}
		if parentTask == nil {
			return nil, ErrTaskNotFound
		}
	}

	tasks, err := s.repo.ListTasks(ctx, userID, filter)
	if err != nil {
		return nil, err
	}

	if tasks == nil {
		return []task.Task{}, nil
	}

	return tasks, nil
}

// GetTask returns a task by ID
func (s *Service) GetTask(ctx context.Context, userID, taskID string) (*task.Task, error) {
	t, err := s.repo.GetTaskByID(ctx, userID, taskID)
	if err != nil {
		return nil, err
	}

	if t == nil {
		return nil, ErrTaskNotFound
	}

	return t, nil
}

// CreateTask creates a new task
func (s *Service) CreateTask(ctx context.Context, userID string, input task.CreateTaskInput) (*task.Task, error) {
	if input.Name == "" {
		return nil, ErrInvalidInput
	}

	if input.ProjectID == "" {
		return nil, ErrInvalidInput
	}

	// Verify project exists and belongs to user
	project, err := s.repo.GetProjectByID(ctx, userID, input.ProjectID)
	if err != nil {
		return nil, err
	}
	if project == nil {
		return nil, ErrProjectNotFound
	}

	// If parent task ID is specified, verify it exists and belongs to user
	if input.ParentTaskID != nil {
		parentTask, err := s.repo.GetTaskByID(ctx, userID, *input.ParentTaskID)
		if err != nil {
			return nil, err
		}
		if parentTask == nil {
			return nil, ErrTaskNotFound
		}
	}

	return s.repo.CreateTask(ctx, userID, input)
}

// UpdateTask updates an existing task
func (s *Service) UpdateTask(ctx context.Context, userID, taskID string, input task.UpdateTaskInput) (*task.Task, error) {
	// Check if task exists and belongs to user
	existing, err := s.repo.GetTaskByID(ctx, userID, taskID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, ErrTaskNotFound
	}

	// If changing project, verify new project exists and belongs to user
	if input.ProjectID != nil {
		project, err := s.repo.GetProjectByID(ctx, userID, *input.ProjectID)
		if err != nil {
			return nil, err
		}
		if project == nil {
			return nil, ErrProjectNotFound
		}
	}

	// If changing parent task, verify it exists and belongs to user
	if input.ParentTaskID != nil {
		parentTask, err := s.repo.GetTaskByID(ctx, userID, *input.ParentTaskID)
		if err != nil {
			return nil, err
		}
		if parentTask == nil {
			return nil, ErrTaskNotFound
		}

		// Prevent circular reference
		if *input.ParentTaskID == taskID {
			return nil, ErrInvalidInput
		}
	}

	t, err := s.repo.UpdateTask(ctx, userID, taskID, input)
	if err != nil {
		return nil, err
	}

	if t == nil {
		return nil, ErrTaskNotFound
	}

	return t, nil
}

// DeleteTask deletes a task
func (s *Service) DeleteTask(ctx context.Context, userID, taskID string) error {
	// Check if task exists and belongs to user
	existing, err := s.repo.GetTaskByID(ctx, userID, taskID)
	if err != nil {
		return err
	}
	if existing == nil {
		return ErrTaskNotFound
	}

	return s.repo.DeleteTask(ctx, userID, taskID)
}

// ToggleTaskComplete toggles the completed status of a task
func (s *Service) ToggleTaskComplete(ctx context.Context, userID, taskID string) (*task.Task, error) {
	// Check if task exists and belongs to user
	existing, err := s.repo.GetTaskByID(ctx, userID, taskID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, ErrTaskNotFound
	}

	t, err := s.repo.ToggleTaskComplete(ctx, userID, taskID)
	if err != nil {
		return nil, err
	}

	if t == nil {
		return nil, ErrTaskNotFound
	}

	return t, nil
}

// GetChildTasks returns all child tasks for a given parent task
func (s *Service) GetChildTasks(ctx context.Context, userID, parentTaskID string) ([]task.Task, error) {
	// Check if parent task exists and belongs to user
	parentTask, err := s.repo.GetTaskByID(ctx, userID, parentTaskID)
	if err != nil {
		return nil, err
	}
	if parentTask == nil {
		return nil, ErrTaskNotFound
	}

	tasks, err := s.repo.GetChildTasks(ctx, userID, parentTaskID)
	if err != nil {
		return nil, err
	}

	if tasks == nil {
		return []task.Task{}, nil
	}

	return tasks, nil
}
