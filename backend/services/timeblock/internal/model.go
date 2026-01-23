package timeblock

import (
	"time"
)

// TimeBlock represents a planned time block for a day
type TimeBlock struct {
	ID            string    `json:"id"`
	UserID        string    `json:"userId"`
	Date          string    `json:"date"`      // YYYY-MM-DD
	StartTime     string    `json:"startTime"` // HH:mm
	EndTime       string    `json:"endTime"`   // HH:mm
	TaskID        *string   `json:"taskId,omitempty"`
	TaskName      string    `json:"taskName"`
	MilestoneID   *string   `json:"milestoneId,omitempty"`
	MilestoneName *string   `json:"milestoneName,omitempty"`
	GoalID        *string   `json:"goalId,omitempty"`
	GoalName      *string   `json:"goalName,omitempty"`
	GoalColor     *string   `json:"goalColor,omitempty"`
	TagIDs        []string  `json:"tagIds,omitempty"`
	IsRoutine     bool      `json:"isRoutine"`
	RoutineTaskID *string   `json:"routineTaskId,omitempty"` // ID of routine task if generated from one
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

// TimeEntry represents an actual time record (実績)
type TimeEntry struct {
	ID            string    `json:"id"`
	UserID        string    `json:"userId"`
	Date          string    `json:"date"`      // YYYY-MM-DD
	StartTime     string    `json:"startTime"` // HH:mm
	EndTime       string    `json:"endTime"`   // HH:mm
	TaskID        *string   `json:"taskId,omitempty"`
	TaskName      string    `json:"taskName"`
	MilestoneID   *string   `json:"milestoneId,omitempty"`
	MilestoneName *string   `json:"milestoneName,omitempty"`
	GoalID        *string   `json:"goalId,omitempty"`
	GoalName      *string   `json:"goalName,omitempty"`
	GoalColor     *string   `json:"goalColor,omitempty"`
	TagIDs        []string  `json:"tagIds,omitempty"`
	Description   *string   `json:"description,omitempty"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

// CreateTimeBlockInput represents the input for creating a time block
type CreateTimeBlockInput struct {
	Date          string   `json:"date"`
	StartTime     string   `json:"startTime"`
	EndTime       string   `json:"endTime"`
	TaskID        *string  `json:"taskId,omitempty"`
	TaskName      string   `json:"taskName"`
	MilestoneID   *string  `json:"milestoneId,omitempty"`
	MilestoneName *string  `json:"milestoneName,omitempty"`
	GoalID        *string  `json:"goalId,omitempty"`
	GoalName      *string  `json:"goalName,omitempty"`
	GoalColor     *string  `json:"goalColor,omitempty"`
	TagIDs        []string `json:"tagIds,omitempty"`
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
	MilestoneID   *string  `json:"milestoneId,omitempty"`
	MilestoneName *string  `json:"milestoneName,omitempty"`
	GoalID        *string  `json:"goalId,omitempty"`
	GoalName      *string  `json:"goalName,omitempty"`
	GoalColor     *string  `json:"goalColor,omitempty"`
	TagIDs        []string `json:"tagIds,omitempty"`
	IsRoutine     *bool    `json:"isRoutine,omitempty"`
	RoutineTaskID *string  `json:"routineTaskId,omitempty"`
}

// CreateTimeEntryInput represents the input for creating a time entry
type CreateTimeEntryInput struct {
	Date          string   `json:"date"`
	StartTime     string   `json:"startTime"`
	EndTime       string   `json:"endTime"`
	TaskID        *string  `json:"taskId,omitempty"`
	TaskName      string   `json:"taskName"`
	MilestoneID   *string  `json:"milestoneId,omitempty"`
	MilestoneName *string  `json:"milestoneName,omitempty"`
	GoalID        *string  `json:"goalId,omitempty"`
	GoalName      *string  `json:"goalName,omitempty"`
	GoalColor     *string  `json:"goalColor,omitempty"`
	TagIDs        []string `json:"tagIds,omitempty"`
	Description   *string  `json:"description,omitempty"`
}

// UpdateTimeEntryInput represents the input for updating a time entry
type UpdateTimeEntryInput struct {
	Date          *string  `json:"date,omitempty"`
	StartTime     *string  `json:"startTime,omitempty"`
	EndTime       *string  `json:"endTime,omitempty"`
	TaskID        *string  `json:"taskId,omitempty"`
	TaskName      *string  `json:"taskName,omitempty"`
	MilestoneID   *string  `json:"milestoneId,omitempty"`
	MilestoneName *string  `json:"milestoneName,omitempty"`
	GoalID        *string  `json:"goalId,omitempty"`
	GoalName      *string  `json:"goalName,omitempty"`
	GoalColor     *string  `json:"goalColor,omitempty"`
	TagIDs        []string `json:"tagIds,omitempty"`
	Description   *string  `json:"description,omitempty"`
}

// TimeBlockFilter represents filters for listing time blocks
type TimeBlockFilter struct {
	Date      *string // Exact date match (YYYY-MM-DD)
	StartDate *string // Range start (inclusive)
	EndDate   *string // Range end (inclusive)
	// UTC timestamp range filters (ISO8601 format)
	// These take precedence over Date/StartDate/EndDate when provided
	StartTimestamp *string // UTC timestamp range start (inclusive)
	EndTimestamp   *string // UTC timestamp range end (exclusive)
	GoalID         *string // Filter by goal
	MilestoneID    *string // Filter by milestone
}

// TimeEntryFilter represents filters for listing time entries
type TimeEntryFilter struct {
	Date        *string // Exact date match (YYYY-MM-DD)
	StartDate   *string // Range start (inclusive)
	EndDate     *string // Range end (inclusive)
	GoalID      *string // Filter by goal
	MilestoneID *string // Filter by milestone
	// UTC timestamp range filters (ISO8601 format)
	// These take precedence over Date/StartDate/EndDate when provided
	StartTimestamp *string // UTC timestamp range start (inclusive)
	EndTimestamp   *string // UTC timestamp range end (exclusive)
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

// RunningTimer represents an active timer for time tracking
type RunningTimer struct {
	ID            string    `json:"id"`
	UserID        string    `json:"userId"`
	TaskID        *string   `json:"taskId,omitempty"`
	TaskName      string    `json:"taskName"`
	MilestoneID   *string   `json:"milestoneId,omitempty"`
	MilestoneName *string   `json:"milestoneName,omitempty"`
	GoalID        *string   `json:"goalId,omitempty"`
	GoalName      *string   `json:"goalName,omitempty"`
	GoalColor     *string   `json:"goalColor,omitempty"`
	TagIDs        []string  `json:"tagIds,omitempty"`
	StartedAt     time.Time `json:"startedAt"`
	CreatedAt     time.Time `json:"createdAt"`
}

// StartTimerInput represents the input for starting a timer
type StartTimerInput struct {
	TaskID        *string  `json:"taskId,omitempty"`
	TaskName      string   `json:"taskName"`
	MilestoneID   *string  `json:"milestoneId,omitempty"`
	MilestoneName *string  `json:"milestoneName,omitempty"`
	GoalID        *string  `json:"goalId,omitempty"`
	GoalName      *string  `json:"goalName,omitempty"`
	GoalColor     *string  `json:"goalColor,omitempty"`
	TagIDs        []string `json:"tagIds,omitempty"`
}

// StopTimerResult represents the result of stopping a timer
type StopTimerResult struct {
	TimeEntry *TimeEntry `json:"timeEntry"`
	Duration  int64      `json:"duration"` // Duration in seconds
}
