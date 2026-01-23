package task

import (
	"time"

	"github.com/kensan/backend/shared/types"
)

// ============================================
// Goal (目標)
// ============================================

// Goal represents a goal entity
type Goal struct {
	ID          string    `json:"id"`
	UserID      string    `json:"userId"`
	Name        string    `json:"name"`
	Description *string   `json:"description,omitempty"`
	Color       string    `json:"color"`
	IsArchived  bool      `json:"isArchived"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// CreateGoalInput represents the input for creating a goal
type CreateGoalInput struct {
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
	Color       string  `json:"color"`
}

// UpdateGoalInput represents the input for updating a goal
type UpdateGoalInput struct {
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
	Color       *string `json:"color,omitempty"`
	IsArchived  *bool   `json:"isArchived,omitempty"`
}

// GoalFilter represents filters for listing goals
type GoalFilter struct {
	IsArchived *bool
}

// ============================================
// Milestone (マイルストーン)
// ============================================

// MilestoneStatus represents the status of a milestone
type MilestoneStatus string

const (
	MilestoneStatusActive    MilestoneStatus = "active"
	MilestoneStatusCompleted MilestoneStatus = "completed"
	MilestoneStatusArchived  MilestoneStatus = "archived"
)

// IsValid checks if the milestone status is valid
func (s MilestoneStatus) IsValid() bool {
	switch s {
	case MilestoneStatusActive, MilestoneStatusCompleted, MilestoneStatusArchived:
		return true
	}
	return false
}

// Milestone represents a milestone entity
type Milestone struct {
	ID          string          `json:"id"`
	UserID      string          `json:"userId"`
	GoalID      string          `json:"goalId"`
	Name        string          `json:"name"`
	Description *string         `json:"description,omitempty"`
	TargetDate  types.DateOnly  `json:"targetDate,omitempty"`
	Status      MilestoneStatus `json:"status"`
	CreatedAt   time.Time       `json:"createdAt"`
	UpdatedAt   time.Time       `json:"updatedAt"`
}

// CreateMilestoneInput represents the input for creating a milestone
type CreateMilestoneInput struct {
	GoalID      string         `json:"goalId"`
	Name        string         `json:"name"`
	Description *string        `json:"description,omitempty"`
	TargetDate  types.DateOnly `json:"targetDate,omitempty"`
}

// UpdateMilestoneInput represents the input for updating a milestone
type UpdateMilestoneInput struct {
	GoalID      *string          `json:"goalId,omitempty"`
	Name        *string          `json:"name,omitempty"`
	Description *string          `json:"description,omitempty"`
	TargetDate  *types.DateOnly  `json:"targetDate,omitempty"`
	Status      *MilestoneStatus `json:"status,omitempty"`
}

// MilestoneFilter represents filters for listing milestones
type MilestoneFilter struct {
	GoalID *string
	Status *MilestoneStatus
}

// ============================================
// Tag (タグ)
// ============================================

// Tag represents a tag entity
type Tag struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Name      string    `json:"name"`
	Color     string    `json:"color"`
	CreatedAt time.Time `json:"createdAt"`
}

// CreateTagInput represents the input for creating a tag
type CreateTagInput struct {
	Name  string `json:"name"`
	Color string `json:"color"`
}

// UpdateTagInput represents the input for updating a tag
type UpdateTagInput struct {
	Name  *string `json:"name,omitempty"`
	Color *string `json:"color,omitempty"`
}

// Task represents a task entity
type Task struct {
	ID               string         `json:"id"`
	UserID           string         `json:"userId"`
	MilestoneID      *string        `json:"milestoneId,omitempty"`
	ParentTaskID     *string        `json:"parentTaskId,omitempty"`
	Name             string         `json:"name"`
	TagIDs           []string       `json:"tagIds,omitempty"`
	EstimatedMinutes *int           `json:"estimatedMinutes,omitempty"`
	Completed        bool           `json:"completed"`
	DueDate          types.DateOnly `json:"dueDate,omitempty"`
	CreatedAt        time.Time      `json:"createdAt"`
	UpdatedAt        time.Time      `json:"updatedAt"`
}

// CreateTaskInput represents the input for creating a task
type CreateTaskInput struct {
	MilestoneID      *string        `json:"milestoneId,omitempty"`
	ParentTaskID     *string        `json:"parentTaskId,omitempty"`
	Name             string         `json:"name"`
	TagIDs           []string       `json:"tagIds,omitempty"`
	EstimatedMinutes *int           `json:"estimatedMinutes,omitempty"`
	Completed        bool           `json:"completed"`
	DueDate          types.DateOnly `json:"dueDate,omitempty"`
}

// UpdateTaskInput represents the input for updating a task
type UpdateTaskInput struct {
	MilestoneID      *string         `json:"milestoneId,omitempty"`
	ParentTaskID     *string         `json:"parentTaskId,omitempty"`
	Name             *string         `json:"name,omitempty"`
	TagIDs           []string        `json:"tagIds,omitempty"`
	EstimatedMinutes *int            `json:"estimatedMinutes,omitempty"`
	Completed        *bool           `json:"completed,omitempty"`
	DueDate          *types.DateOnly `json:"dueDate,omitempty"`
}

// TaskFilter represents filters for listing tasks
type TaskFilter struct {
	MilestoneID  *string
	Completed    *bool
	ParentTaskID *string
	HasParent    *bool // true = only subtasks, false = only root tasks, nil = all
}
