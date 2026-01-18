package repository

import (
	"context"

	"github.com/kensan/backend/services/record/internal"
)

// Repository defines the interface for learning record data persistence
type Repository interface {
	// GetByID retrieves a learning record by ID (with content)
	GetByID(ctx context.Context, id string) (*record.LearningRecord, error)

	// GetByIDAndUserID retrieves a learning record by ID and user ID (with content)
	GetByIDAndUserID(ctx context.Context, id, userID string) (*record.LearningRecord, error)

	// List retrieves learning records for a user with optional filters (without content)
	List(ctx context.Context, userID string, filter *record.RecordFilter) ([]*record.LearningRecordListItem, error)

	// Create creates a new learning record
	Create(ctx context.Context, rec *record.LearningRecord) error

	// Update updates an existing learning record
	Update(ctx context.Context, rec *record.LearningRecord) error

	// Delete deletes a learning record
	Delete(ctx context.Context, id string) error

	// DeleteByIDAndUserID deletes a learning record by ID and user ID
	DeleteByIDAndUserID(ctx context.Context, id, userID string) error

	// SemanticSearch performs a semantic search on learning records
	SemanticSearch(ctx context.Context, userID, query string, limit int) ([]*record.SemanticSearchResult, error)
}
