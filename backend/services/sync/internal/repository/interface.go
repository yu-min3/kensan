package repository

import (
	"context"
	"time"

	"github.com/kensan/backend/services/sync/internal"
)

// Repository defines the interface for sync repository operations
type Repository interface {
	// GetSyncStatus retrieves the sync status for a user
	GetSyncStatus(ctx context.Context, userID string) (*sync.SyncStatus, error)

	// UpdateSyncStatus updates or inserts the sync status for a user
	UpdateSyncStatus(ctx context.Context, status *sync.SyncStatus) error

	// GetUserClockifySettings retrieves Clockify settings for a user
	GetUserClockifySettings(ctx context.Context, userID string) (*sync.UserClockifySettings, error)

	// UpdateUserClockifySettings updates Clockify settings for a user
	UpdateUserClockifySettings(ctx context.Context, settings *sync.UserClockifySettings) error

	// UpsertProject upserts a project from Clockify
	UpsertProject(ctx context.Context, userID, projectID, name, color string, archived bool, clientID, clientName *string) (created bool, err error)

	// UpsertTask upserts a task from Clockify
	UpsertTask(ctx context.Context, userID, taskID, clockifyProjectID, name string, completed bool) (created bool, err error)

	// UpsertTimeEntry upserts a time entry from Clockify
	UpsertTimeEntry(ctx context.Context, userID, entryID, description, projectID string, taskID *string, start, end time.Time, duration string) (created bool, err error)

	// GetProjectByClockifyID retrieves a project by its Clockify ID
	GetProjectByClockifyID(ctx context.Context, userID, clockifyID string) (exists bool, err error)

	// GetTimeEntryByClockifyID retrieves a time entry by its Clockify ID
	GetTimeEntryByClockifyID(ctx context.Context, userID, clockifyID string) (exists bool, err error)
}
