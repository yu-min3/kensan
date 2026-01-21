package task

import (
	"time"
)

// GoalTag represents the type of goal for a project
type GoalTag string

const (
	GoalTagGK     GoalTag = "GK"
	GoalTagOSS    GoalTag = "OSS"
	GoalTagOutput GoalTag = "Output"
	GoalTagOther  GoalTag = "Other"
)

// IsValid checks if the goal tag is valid
func (g GoalTag) IsValid() bool {
	switch g {
	case GoalTagGK, GoalTagOSS, GoalTagOutput, GoalTagOther:
		return true
	}
	return false
}

// Project represents a project entity
type Project struct {
	ID         string    `json:"id"`
	UserID     string    `json:"userId"`
	ClockifyID *string   `json:"clockifyId,omitempty"`
	Name       string    `json:"name"`
	GoalTag    *GoalTag  `json:"goalTag,omitempty"`
	Color      *string   `json:"color,omitempty"`
	IsArchived bool      `json:"isArchived"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

// Task represents a task entity
type Task struct {
	ID               string    `json:"id"`
	UserID           string    `json:"userId"`
	ProjectID        string    `json:"projectId"`
	ClockifyID       *string   `json:"clockifyId,omitempty"`
	ParentTaskID     *string   `json:"parentTaskId,omitempty"`
	Name             string    `json:"name"`
	GoalTag          *GoalTag  `json:"goalTag,omitempty"`
	EstimatedMinutes *int      `json:"estimatedMinutes,omitempty"`
	Completed        bool      `json:"completed"`
	DueDate          *string   `json:"dueDate,omitempty"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

// CreateProjectInput represents the input for creating a project
type CreateProjectInput struct {
	Name       string   `json:"name"`
	ClockifyID *string  `json:"clockifyId,omitempty"`
	GoalTag    *GoalTag `json:"goalTag,omitempty"`
	Color      *string  `json:"color,omitempty"`
	IsArchived bool     `json:"isArchived"`
}

// UpdateProjectInput represents the input for updating a project
type UpdateProjectInput struct {
	Name       *string  `json:"name,omitempty"`
	ClockifyID *string  `json:"clockifyId,omitempty"`
	GoalTag    *GoalTag `json:"goalTag,omitempty"`
	Color      *string  `json:"color,omitempty"`
	IsArchived *bool    `json:"isArchived,omitempty"`
}

// CreateTaskInput represents the input for creating a task
type CreateTaskInput struct {
	ProjectID        string   `json:"projectId"`
	ClockifyID       *string  `json:"clockifyId,omitempty"`
	ParentTaskID     *string  `json:"parentTaskId,omitempty"`
	Name             string   `json:"name"`
	GoalTag          *GoalTag `json:"goalTag,omitempty"`
	EstimatedMinutes *int     `json:"estimatedMinutes,omitempty"`
	Completed        bool     `json:"completed"`
	DueDate          *string  `json:"dueDate,omitempty"`
}

// UpdateTaskInput represents the input for updating a task
type UpdateTaskInput struct {
	ProjectID        *string  `json:"projectId,omitempty"`
	ClockifyID       *string  `json:"clockifyId,omitempty"`
	ParentTaskID     *string  `json:"parentTaskId,omitempty"`
	Name             *string  `json:"name,omitempty"`
	GoalTag          *GoalTag `json:"goalTag,omitempty"`
	EstimatedMinutes *int     `json:"estimatedMinutes,omitempty"`
	Completed        *bool    `json:"completed,omitempty"`
	DueDate          *string  `json:"dueDate,omitempty"`
}

// ProjectFilter represents filters for listing projects
type ProjectFilter struct {
	IsArchived *bool
	GoalTag    *GoalTag
}

// TaskFilter represents filters for listing tasks
type TaskFilter struct {
	ProjectID    *string
	Completed    *bool
	ParentTaskID *string
	HasParent    *bool // true = only subtasks, false = only root tasks, nil = all
}
