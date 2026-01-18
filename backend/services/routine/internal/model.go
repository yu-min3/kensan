package routine

import (
	"time"
)

// RoutineFrequency represents the frequency type for a routine task
type RoutineFrequency string

const (
	FrequencyDaily   RoutineFrequency = "daily"
	FrequencyWeekly  RoutineFrequency = "weekly"
	FrequencyMonthly RoutineFrequency = "monthly"
	FrequencyCustom  RoutineFrequency = "custom"
)

// IsValid checks if the frequency is valid
func (f RoutineFrequency) IsValid() bool {
	switch f {
	case FrequencyDaily, FrequencyWeekly, FrequencyMonthly, FrequencyCustom:
		return true
	}
	return false
}

// RoutineTask represents a routine task entity
type RoutineTask struct {
	ID               string           `json:"id"`
	UserID           string           `json:"userId"`
	Name             string           `json:"name"`
	Frequency        RoutineFrequency `json:"frequency"`
	DaysOfWeek       []int            `json:"daysOfWeek,omitempty"`     // 0=Sunday, 1=Monday, ..., 6=Saturday
	EstimatedMinutes int              `json:"estimatedMinutes"`
	DefaultStartTime *string          `json:"defaultStartTime,omitempty"` // HH:mm format
	Enabled          bool             `json:"enabled"`
	CreatedAt        time.Time        `json:"createdAt"`
	UpdatedAt        time.Time        `json:"updatedAt"`
}

// CreateRoutineInput represents the input for creating a routine task
type CreateRoutineInput struct {
	Name             string           `json:"name"`
	Frequency        RoutineFrequency `json:"frequency"`
	DaysOfWeek       []int            `json:"daysOfWeek,omitempty"`
	EstimatedMinutes int              `json:"estimatedMinutes"`
	DefaultStartTime *string          `json:"defaultStartTime,omitempty"`
	Enabled          bool             `json:"enabled"`
}

// UpdateRoutineInput represents the input for updating a routine task
type UpdateRoutineInput struct {
	Name             *string           `json:"name,omitempty"`
	Frequency        *RoutineFrequency `json:"frequency,omitempty"`
	DaysOfWeek       []int             `json:"daysOfWeek,omitempty"`
	EstimatedMinutes *int              `json:"estimatedMinutes,omitempty"`
	DefaultStartTime *string           `json:"defaultStartTime,omitempty"`
	Enabled          *bool             `json:"enabled,omitempty"`
}

// RoutineFilter represents filters for listing routine tasks
type RoutineFilter struct {
	Enabled *bool
	ForDate *time.Time // Filter by date (checks day of week)
}

// MatchesDayOfWeek checks if the routine matches the given day of week
func (r *RoutineTask) MatchesDayOfWeek(dayOfWeek int) bool {
	switch r.Frequency {
	case FrequencyDaily:
		return true
	case FrequencyWeekly, FrequencyMonthly, FrequencyCustom:
		for _, d := range r.DaysOfWeek {
			if d == dayOfWeek {
				return true
			}
		}
		return false
	default:
		return false
	}
}
