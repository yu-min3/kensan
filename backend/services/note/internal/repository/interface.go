package repository

import (
	"context"

	"github.com/kensan/backend/services/note/internal"
)

// Repository defines the interface for note data persistence
type Repository interface {
	// GetByID retrieves a note by ID (with content)
	GetByID(ctx context.Context, id string) (*note.Note, error)

	// GetByIDAndUserID retrieves a note by ID and user ID (with content)
	GetByIDAndUserID(ctx context.Context, id, userID string) (*note.Note, error)

	// List retrieves notes for a user with optional filters (without content)
	List(ctx context.Context, userID string, filter *note.NoteFilter) ([]*note.NoteListItem, error)

	// Create creates a new note
	Create(ctx context.Context, n *note.Note) error

	// Update updates an existing note
	Update(ctx context.Context, n *note.Note) error

	// Delete deletes a note
	Delete(ctx context.Context, id string) error

	// DeleteByIDAndUserID deletes a note by ID and user ID
	DeleteByIDAndUserID(ctx context.Context, id, userID string) error

	// Search performs a full-text search on notes
	Search(ctx context.Context, userID, query string, filter *note.NoteFilter, limit int) ([]*note.SearchResult, error)

	// UpdateTags updates the tags for a note (note_tags junction table)
	UpdateTags(ctx context.Context, noteID string, tagIDs []string) error

	// GetTagIDs retrieves the tag IDs for a note
	GetTagIDs(ctx context.Context, noteID string) ([]string, error)

	// ========== NoteContent Operations ==========

	// ListContents retrieves all contents for a note
	ListContents(ctx context.Context, noteID string) ([]*note.NoteContent, error)

	// GetContent retrieves a content by ID
	GetContent(ctx context.Context, contentID string) (*note.NoteContent, error)

	// CreateContent creates a new note content
	CreateContent(ctx context.Context, content *note.NoteContent) error

	// UpdateContent updates an existing note content
	UpdateContent(ctx context.Context, content *note.NoteContent) error

	// DeleteContent deletes a note content
	DeleteContent(ctx context.Context, contentID string) error

	// ReorderContents updates the sort order of contents
	ReorderContents(ctx context.Context, noteID string, contentIDs []string) error

	// UpdateIndexStatus updates the index status of a note
	UpdateIndexStatus(ctx context.Context, noteID string, status note.IndexStatus) error
}
