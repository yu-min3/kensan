package repository

import (
	"context"

	"github.com/kensan/backend/services/timeblock/internal"
)

// Repository defines the interface for timeblock data access
type Repository interface {
	// TimeBlock Operations
	ListTimeBlocks(ctx context.Context, userID string, filter timeblock.TimeBlockFilter) ([]timeblock.TimeBlock, error)
	GetTimeBlockByID(ctx context.Context, userID, timeBlockID string) (*timeblock.TimeBlock, error)
	CreateTimeBlock(ctx context.Context, userID string, input timeblock.CreateTimeBlockInput) (*timeblock.TimeBlock, error)
	UpdateTimeBlock(ctx context.Context, userID, timeBlockID string, input timeblock.UpdateTimeBlockInput) (*timeblock.TimeBlock, error)
	DeleteTimeBlock(ctx context.Context, userID, timeBlockID string) error
	CreateTimeBlockBatch(ctx context.Context, userID string, inputs []timeblock.CreateTimeBlockInput) ([]timeblock.TimeBlock, error)

	// TimeEntry Operations
	ListTimeEntries(ctx context.Context, userID string, filter timeblock.TimeEntryFilter) ([]timeblock.TimeEntry, error)
	GetTimeEntryByID(ctx context.Context, userID, timeEntryID string) (*timeblock.TimeEntry, error)
	CreateTimeEntry(ctx context.Context, userID string, input timeblock.CreateTimeEntryInput) (*timeblock.TimeEntry, error)
	UpdateTimeEntry(ctx context.Context, userID, timeEntryID string, input timeblock.UpdateTimeEntryInput) (*timeblock.TimeEntry, error)
	DeleteTimeEntry(ctx context.Context, userID, timeEntryID string) error
}
