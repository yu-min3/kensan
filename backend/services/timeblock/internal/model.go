package timeblock

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

// TimeBlock represents a planned time block for a day
type TimeBlock struct {
	ID            string    `json:"id"`
	UserID        string    `json:"userId"`
	Date          string    `json:"date"`      // YYYY-MM-DD
	StartTime     string    `json:"startTime"` // HH:mm
	EndTime       string    `json:"endTime"`   // HH:mm
	TaskID        *string   `json:"taskId,omitempty"`
	TaskName      string    `json:"taskName"`
	ProjectID     *string   `json:"projectId,omitempty"`
	ProjectName   *string   `json:"projectName,omitempty"`
	GoalTag       *GoalTag  `json:"goalTag,omitempty"`
	IsRoutine     bool      `json:"isRoutine"`
	RoutineTaskID *string   `json:"routineTaskId,omitempty"` // ID of routine task if generated from one
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

// TimeEntry represents an actual time record (実績)
type TimeEntry struct {
	ID          string    `json:"id"`
	ClockifyID  *string   `json:"clockifyId,omitempty"` // Clockify side ID
	UserID      string    `json:"userId"`
	Date        string    `json:"date"`      // YYYY-MM-DD
	StartTime   string    `json:"startTime"` // HH:mm
	EndTime     string    `json:"endTime"`   // HH:mm
	TaskID      *string   `json:"taskId,omitempty"`
	TaskName    string    `json:"taskName"`
	ProjectID   *string   `json:"projectId,omitempty"`
	ProjectName *string   `json:"projectName,omitempty"`
	GoalTag     *GoalTag  `json:"goalTag,omitempty"`
	Description *string   `json:"description,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// CreateTimeBlockInput represents the input for creating a time block
type CreateTimeBlockInput struct {
	Date          string   `json:"date"`
	StartTime     string   `json:"startTime"`
	EndTime       string   `json:"endTime"`
	TaskID        *string  `json:"taskId,omitempty"`
	TaskName      string   `json:"taskName"`
	ProjectID     *string  `json:"projectId,omitempty"`
	ProjectName   *string  `json:"projectName,omitempty"`
	GoalTag       *GoalTag `json:"goalTag,omitempty"`
	IsRoutine     bool     `json:"isRoutine"`
	RoutineTaskID *string  `json:"routineTaskId,omitempty"`
}

// UpdateTimeBlockInput represents the input for updating a time block
type UpdateTimeBlockInput struct {
	Date          *string  `json:"date,omitempty"`
	StartTime     *string  `json:"startTime,omitempty"`
	EndTime       *string  `json:"endTime,omitempty"`
	TaskID        *string  `json:"taskId,omitempty"`
	TaskName      *string  `json:"taskName,omitempty"`
	ProjectID     *string  `json:"projectId,omitempty"`
	ProjectName   *string  `json:"projectName,omitempty"`
	GoalTag       *GoalTag `json:"goalTag,omitempty"`
	IsRoutine     *bool    `json:"isRoutine,omitempty"`
	RoutineTaskID *string  `json:"routineTaskId,omitempty"`
}

// CreateTimeEntryInput represents the input for creating a time entry
type CreateTimeEntryInput struct {
	ClockifyID  *string  `json:"clockifyId,omitempty"`
	Date        string   `json:"date"`
	StartTime   string   `json:"startTime"`
	EndTime     string   `json:"endTime"`
	TaskID      *string  `json:"taskId,omitempty"`
	TaskName    string   `json:"taskName"`
	ProjectID   *string  `json:"projectId,omitempty"`
	ProjectName *string  `json:"projectName,omitempty"`
	GoalTag     *GoalTag `json:"goalTag,omitempty"`
	Description *string  `json:"description,omitempty"`
}

// UpdateTimeEntryInput represents the input for updating a time entry
type UpdateTimeEntryInput struct {
	ClockifyID  *string  `json:"clockifyId,omitempty"`
	Date        *string  `json:"date,omitempty"`
	StartTime   *string  `json:"startTime,omitempty"`
	EndTime     *string  `json:"endTime,omitempty"`
	TaskID      *string  `json:"taskId,omitempty"`
	TaskName    *string  `json:"taskName,omitempty"`
	ProjectID   *string  `json:"projectId,omitempty"`
	ProjectName *string  `json:"projectName,omitempty"`
	GoalTag     *GoalTag `json:"goalTag,omitempty"`
	Description *string  `json:"description,omitempty"`
}

// TimeBlockFilter represents filters for listing time blocks
type TimeBlockFilter struct {
	Date      *string // Exact date match (YYYY-MM-DD)
	StartDate *string // Range start (inclusive)
	EndDate   *string // Range end (inclusive)
}

// TimeEntryFilter represents filters for listing time entries
type TimeEntryFilter struct {
	Date      *string  // Exact date match (YYYY-MM-DD)
	StartDate *string  // Range start (inclusive)
	EndDate   *string  // Range end (inclusive)
	ProjectID *string  // Filter by project
	GoalTag   *GoalTag // Filter by goal tag
}

// GenerateFromRoutinesInput represents input for generating time blocks from routines
type GenerateFromRoutinesInput struct {
	Date string `json:"date"` // The date to generate time blocks for
}

// GenerateFromRoutinesResult represents the result of generating time blocks
type GenerateFromRoutinesResult struct {
	Generated int         `json:"generated"` // Number of time blocks generated
	Blocks    []TimeBlock `json:"blocks"`    // The generated time blocks
}
