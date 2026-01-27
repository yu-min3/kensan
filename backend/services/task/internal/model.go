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
	ID         string    `json:"id"`
	UserID     string    `json:"userId"`
	Name       string    `json:"name"`
	Color      string    `json:"color"`
	Pinned     bool      `json:"pinned"`
	UsageCount int       `json:"usageCount"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

// CreateTagInput represents the input for creating a tag
type CreateTagInput struct {
	Name   string `json:"name"`
	Color  string `json:"color"`
	Pinned *bool  `json:"pinned,omitempty"`
}

// UpdateTagInput represents the input for updating a tag
type UpdateTagInput struct {
	Name   *string `json:"name,omitempty"`
	Color  *string `json:"color,omitempty"`
	Pinned *bool   `json:"pinned,omitempty"`
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

// ============================================
// EntityMemo (エンティティメモ)
// ============================================

// EntityType represents the type of entity a memo is attached to
type EntityType string

const (
	EntityTypeGoal      EntityType = "goal"
	EntityTypeMilestone EntityType = "milestone"
	EntityTypeTask      EntityType = "task"
)

// IsValid checks if the entity type is valid
func (t EntityType) IsValid() bool {
	switch t {
	case EntityTypeGoal, EntityTypeMilestone, EntityTypeTask:
		return true
	}
	return false
}

// EntityMemo represents a memo attached to a goal, milestone, or task
type EntityMemo struct {
	ID         string     `json:"id"`
	UserID     string     `json:"userId"`
	EntityType EntityType `json:"entityType"`
	EntityID   string     `json:"entityId"`
	Content    string     `json:"content"`
	Pinned     bool       `json:"pinned"`
	CreatedAt  time.Time  `json:"createdAt"`
	UpdatedAt  time.Time  `json:"updatedAt"`
}

// CreateEntityMemoInput represents the input for creating an entity memo
type CreateEntityMemoInput struct {
	EntityType EntityType `json:"entityType"`
	EntityID   string     `json:"entityId"`
	Content    string     `json:"content"`
	Pinned     bool       `json:"pinned"`
}

// UpdateEntityMemoInput represents the input for updating an entity memo
type UpdateEntityMemoInput struct {
	Content *string `json:"content,omitempty"`
	Pinned  *bool   `json:"pinned,omitempty"`
}

// EntityMemoFilter represents filters for listing entity memos
type EntityMemoFilter struct {
	EntityType *EntityType
	EntityID   *string
	Pinned     *bool
}

// ============================================
// Todo (単発タスク + 繰り返しタスク統合)
// ============================================

// TodoFrequency represents the frequency of a recurring todo
type TodoFrequency string

const (
	TodoFrequencyDaily   TodoFrequency = "daily"
	TodoFrequencyWeekly  TodoFrequency = "weekly"
	TodoFrequencyMonthly TodoFrequency = "monthly"
	TodoFrequencyCustom  TodoFrequency = "custom"
)

// IsValid checks if the todo frequency is valid
func (f TodoFrequency) IsValid() bool {
	switch f {
	case TodoFrequencyDaily, TodoFrequencyWeekly, TodoFrequencyMonthly, TodoFrequencyCustom:
		return true
	}
	return false
}

// Todo represents a todo item (one-off or recurring)
type Todo struct {
	ID               string         `json:"id"`
	UserID           string         `json:"userId"`
	Name             string         `json:"name"`
	Frequency        *TodoFrequency `json:"frequency,omitempty"`  // nil = one-off task
	DaysOfWeek       []int          `json:"daysOfWeek,omitempty"` // 0=Sun, 1=Mon, ..., 6=Sat
	DueDate          types.DateOnly `json:"dueDate,omitempty"`    // for one-off tasks
	EstimatedMinutes *int           `json:"estimatedMinutes,omitempty"`
	TagIDs           []string       `json:"tagIds,omitempty"`
	Enabled          bool           `json:"enabled"`
	CreatedAt        time.Time      `json:"createdAt"`
	UpdatedAt        time.Time      `json:"updatedAt"`
}

// TodoWithStatus includes completion status for a specific date
type TodoWithStatus struct {
	Todo
	CompletedToday bool       `json:"completedToday"`
	CompletedAt    *time.Time `json:"completedAt,omitempty"`
	IsOverdue      bool       `json:"isOverdue"` // for one-off tasks with due_date < today
}

// TodoCompletion represents a completion record for a todo
type TodoCompletion struct {
	ID            string         `json:"id"`
	TodoID        string         `json:"todoId"`
	CompletedDate types.DateOnly `json:"completedDate"` // YYYY-MM-DD
	CompletedAt   time.Time      `json:"completedAt"`
}

// CreateTodoInput represents the input for creating a todo
type CreateTodoInput struct {
	Name             string         `json:"name"`
	Frequency        *TodoFrequency `json:"frequency,omitempty"`
	DaysOfWeek       []int          `json:"daysOfWeek,omitempty"`
	DueDate          types.DateOnly `json:"dueDate,omitempty"`
	EstimatedMinutes *int           `json:"estimatedMinutes,omitempty"`
	TagIDs           []string       `json:"tagIds,omitempty"`
}

// UpdateTodoInput represents the input for updating a todo
type UpdateTodoInput struct {
	Name             *string         `json:"name,omitempty"`
	Frequency        *TodoFrequency  `json:"frequency,omitempty"`
	DaysOfWeek       []int           `json:"daysOfWeek,omitempty"`
	DueDate          *types.DateOnly `json:"dueDate,omitempty"`
	EstimatedMinutes *int            `json:"estimatedMinutes,omitempty"`
	TagIDs           []string        `json:"tagIds,omitempty"`
	Enabled          *bool           `json:"enabled,omitempty"`
}

// TodoFilter represents filters for listing todos
type TodoFilter struct {
	Date       *string // YYYY-MM-DD - filter todos applicable for this date
	Enabled    *bool
	IsRecurring *bool  // true = recurring only, false = one-off only, nil = all
}
