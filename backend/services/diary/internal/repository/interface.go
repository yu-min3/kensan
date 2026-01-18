package repository

import (
	"context"

	"github.com/kensan/backend/services/diary/internal"
)

// Repository defines the interface for diary entry data persistence
type Repository interface {
	// GetByID retrieves a diary entry by ID
	GetByID(ctx context.Context, id string) (*diary.DiaryEntry, error)

	// GetByIDAndUserID retrieves a diary entry by ID and user ID
	GetByIDAndUserID(ctx context.Context, id, userID string) (*diary.DiaryEntry, error)

	// GetByDateAndUserID retrieves a diary entry by date and user ID
	GetByDateAndUserID(ctx context.Context, date, userID string) (*diary.DiaryEntry, error)

	// List retrieves diary entries for a user with optional filters
	List(ctx context.Context, userID string, filter *diary.DiaryFilter) ([]*diary.DiaryEntryListItem, error)

	// Create creates a new diary entry
	Create(ctx context.Context, entry *diary.DiaryEntry) error

	// Update updates an existing diary entry
	Update(ctx context.Context, entry *diary.DiaryEntry) error

	// Delete deletes a diary entry
	Delete(ctx context.Context, id string) error

	// DeleteByIDAndUserID deletes a diary entry by ID and user ID
	DeleteByIDAndUserID(ctx context.Context, id, userID string) error
}
