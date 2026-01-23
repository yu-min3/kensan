package service

import (
	"context"
	"errors"

	"github.com/kensan/backend/services/task/internal"
	"github.com/kensan/backend/services/task/internal/repository"
)

var (
	ErrTaskNotFound      = errors.New("task not found")
	ErrGoalNotFound      = errors.New("goal not found")
	ErrMilestoneNotFound = errors.New("milestone not found")
	ErrTagNotFound       = errors.New("tag not found")
	ErrInvalidStatus     = errors.New("invalid milestone status")
	ErrInvalidInput      = errors.New("invalid input")
)

// Service handles business logic for tasks, goals, milestones, and tags
type Service struct {
	repo repository.Repository
}

// NewService creates a new task service
func NewService(repo repository.Repository) *Service {
	return &Service{repo: repo}
}

// ========== Task Operations ==========

// ListTasks returns all tasks for a user with optional filters
func (s *Service) ListTasks(ctx context.Context, userID string, filter task.TaskFilter) ([]task.Task, error) {
	// If milestone_id is specified, verify it belongs to the user
	if filter.MilestoneID != nil {
		milestone, err := s.repo.GetMilestoneByID(ctx, userID, *filter.MilestoneID)
		if err != nil {
			return nil, err
		}
		if milestone == nil {
			return nil, ErrMilestoneNotFound
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

	// If milestone_id is specified, verify it exists and belongs to user
	if input.MilestoneID != nil {
		milestone, err := s.repo.GetMilestoneByID(ctx, userID, *input.MilestoneID)
		if err != nil {
			return nil, err
		}
		if milestone == nil {
			return nil, ErrMilestoneNotFound
		}
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

	// If changing milestone, verify new milestone exists and belongs to user
	if input.MilestoneID != nil {
		milestone, err := s.repo.GetMilestoneByID(ctx, userID, *input.MilestoneID)
		if err != nil {
			return nil, err
		}
		if milestone == nil {
			return nil, ErrMilestoneNotFound
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

// ========== Goal Operations ==========

// ListGoals returns all goals for a user
func (s *Service) ListGoals(ctx context.Context, userID string, filter task.GoalFilter) ([]task.Goal, error) {
	goals, err := s.repo.ListGoals(ctx, userID, filter)
	if err != nil {
		return nil, err
	}
	if goals == nil {
		return []task.Goal{}, nil
	}
	return goals, nil
}

// GetGoal returns a goal by ID
func (s *Service) GetGoal(ctx context.Context, userID, goalID string) (*task.Goal, error) {
	goal, err := s.repo.GetGoalByID(ctx, userID, goalID)
	if err != nil {
		return nil, err
	}
	if goal == nil {
		return nil, ErrGoalNotFound
	}
	return goal, nil
}

// CreateGoal creates a new goal
func (s *Service) CreateGoal(ctx context.Context, userID string, input task.CreateGoalInput) (*task.Goal, error) {
	if input.Name == "" {
		return nil, ErrInvalidInput
	}
	if input.Color == "" {
		input.Color = "#0EA5E9" // default color
	}
	return s.repo.CreateGoal(ctx, userID, input)
}

// UpdateGoal updates an existing goal
func (s *Service) UpdateGoal(ctx context.Context, userID, goalID string, input task.UpdateGoalInput) (*task.Goal, error) {
	existing, err := s.repo.GetGoalByID(ctx, userID, goalID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, ErrGoalNotFound
	}
	goal, err := s.repo.UpdateGoal(ctx, userID, goalID, input)
	if err != nil {
		return nil, err
	}
	if goal == nil {
		return nil, ErrGoalNotFound
	}
	return goal, nil
}

// DeleteGoal deletes a goal
func (s *Service) DeleteGoal(ctx context.Context, userID, goalID string) error {
	existing, err := s.repo.GetGoalByID(ctx, userID, goalID)
	if err != nil {
		return err
	}
	if existing == nil {
		return ErrGoalNotFound
	}
	return s.repo.DeleteGoal(ctx, userID, goalID)
}

// ========== Milestone Operations ==========

// ListMilestones returns all milestones for a user
func (s *Service) ListMilestones(ctx context.Context, userID string, filter task.MilestoneFilter) ([]task.Milestone, error) {
	// Verify goal exists if specified
	if filter.GoalID != nil {
		goal, err := s.repo.GetGoalByID(ctx, userID, *filter.GoalID)
		if err != nil {
			return nil, err
		}
		if goal == nil {
			return nil, ErrGoalNotFound
		}
	}
	if filter.Status != nil && !filter.Status.IsValid() {
		return nil, ErrInvalidStatus
	}
	milestones, err := s.repo.ListMilestones(ctx, userID, filter)
	if err != nil {
		return nil, err
	}
	if milestones == nil {
		return []task.Milestone{}, nil
	}
	return milestones, nil
}

// GetMilestone returns a milestone by ID
func (s *Service) GetMilestone(ctx context.Context, userID, milestoneID string) (*task.Milestone, error) {
	milestone, err := s.repo.GetMilestoneByID(ctx, userID, milestoneID)
	if err != nil {
		return nil, err
	}
	if milestone == nil {
		return nil, ErrMilestoneNotFound
	}
	return milestone, nil
}

// CreateMilestone creates a new milestone
func (s *Service) CreateMilestone(ctx context.Context, userID string, input task.CreateMilestoneInput) (*task.Milestone, error) {
	if input.Name == "" || input.GoalID == "" {
		return nil, ErrInvalidInput
	}
	// Verify goal exists
	goal, err := s.repo.GetGoalByID(ctx, userID, input.GoalID)
	if err != nil {
		return nil, err
	}
	if goal == nil {
		return nil, ErrGoalNotFound
	}
	return s.repo.CreateMilestone(ctx, userID, input)
}

// UpdateMilestone updates an existing milestone
func (s *Service) UpdateMilestone(ctx context.Context, userID, milestoneID string, input task.UpdateMilestoneInput) (*task.Milestone, error) {
	existing, err := s.repo.GetMilestoneByID(ctx, userID, milestoneID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, ErrMilestoneNotFound
	}
	// Verify new goal if specified
	if input.GoalID != nil {
		goal, err := s.repo.GetGoalByID(ctx, userID, *input.GoalID)
		if err != nil {
			return nil, err
		}
		if goal == nil {
			return nil, ErrGoalNotFound
		}
	}
	if input.Status != nil && !input.Status.IsValid() {
		return nil, ErrInvalidStatus
	}
	milestone, err := s.repo.UpdateMilestone(ctx, userID, milestoneID, input)
	if err != nil {
		return nil, err
	}
	if milestone == nil {
		return nil, ErrMilestoneNotFound
	}
	return milestone, nil
}

// DeleteMilestone deletes a milestone
func (s *Service) DeleteMilestone(ctx context.Context, userID, milestoneID string) error {
	existing, err := s.repo.GetMilestoneByID(ctx, userID, milestoneID)
	if err != nil {
		return err
	}
	if existing == nil {
		return ErrMilestoneNotFound
	}
	return s.repo.DeleteMilestone(ctx, userID, milestoneID)
}

// ========== Tag Operations ==========

// ListTags returns all tags for a user
func (s *Service) ListTags(ctx context.Context, userID string) ([]task.Tag, error) {
	tags, err := s.repo.ListTags(ctx, userID)
	if err != nil {
		return nil, err
	}
	if tags == nil {
		return []task.Tag{}, nil
	}
	return tags, nil
}

// GetTag returns a tag by ID
func (s *Service) GetTag(ctx context.Context, userID, tagID string) (*task.Tag, error) {
	tag, err := s.repo.GetTagByID(ctx, userID, tagID)
	if err != nil {
		return nil, err
	}
	if tag == nil {
		return nil, ErrTagNotFound
	}
	return tag, nil
}

// CreateTag creates a new tag
func (s *Service) CreateTag(ctx context.Context, userID string, input task.CreateTagInput) (*task.Tag, error) {
	if input.Name == "" {
		return nil, ErrInvalidInput
	}
	if input.Color == "" {
		input.Color = "#6B7280" // default color
	}
	return s.repo.CreateTag(ctx, userID, input)
}

// UpdateTag updates an existing tag
func (s *Service) UpdateTag(ctx context.Context, userID, tagID string, input task.UpdateTagInput) (*task.Tag, error) {
	existing, err := s.repo.GetTagByID(ctx, userID, tagID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, ErrTagNotFound
	}
	tag, err := s.repo.UpdateTag(ctx, userID, tagID, input)
	if err != nil {
		return nil, err
	}
	if tag == nil {
		return nil, ErrTagNotFound
	}
	return tag, nil
}

// DeleteTag deletes a tag
func (s *Service) DeleteTag(ctx context.Context, userID, tagID string) error {
	existing, err := s.repo.GetTagByID(ctx, userID, tagID)
	if err != nil {
		return err
	}
	if existing == nil {
		return ErrTagNotFound
	}
	return s.repo.DeleteTag(ctx, userID, tagID)
}
