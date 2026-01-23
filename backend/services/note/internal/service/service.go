package service

import (
	"context"
	"errors"
	"strings"

	"github.com/kensan/backend/services/note/internal"
	"github.com/kensan/backend/services/note/internal/repository"
)

var (
	ErrNoteNotFound     = errors.New("note not found")
	ErrTypeRequired     = errors.New("type is required")
	ErrInvalidType      = errors.New("type must be diary, learning, or memo")
	ErrTitleRequired    = errors.New("title is required for diary and learning notes")
	ErrContentRequired  = errors.New("content is required")
	ErrFormatRequired   = errors.New("format is required")
	ErrInvalidFormat    = errors.New("format must be markdown or drawio")
	ErrDateRequired     = errors.New("date is required for diary notes")
	ErrQueryRequired    = errors.New("query is required for search")
	ErrUnauthorized     = errors.New("not authorized to access this note")
)

// Service handles note business logic
type Service struct {
	repo repository.Repository
}

// NewService creates a new note service
func NewService(repo repository.Repository) *Service {
	return &Service{
		repo: repo,
	}
}

// List retrieves notes for a user with optional filters
func (s *Service) List(ctx context.Context, userID string, filter *note.NoteFilter) ([]*note.NoteListItem, error) {
	return s.repo.List(ctx, userID, filter)
}

// GetByID retrieves a note by ID (with content)
func (s *Service) GetByID(ctx context.Context, userID, noteID string) (*note.Note, error) {
	n, err := s.repo.GetByIDAndUserID(ctx, noteID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNoteNotFound) {
			return nil, ErrNoteNotFound
		}
		return nil, err
	}
	return n, nil
}

// Create creates a new note
func (s *Service) Create(ctx context.Context, userID string, input *note.CreateNoteInput) (*note.Note, error) {
	// Validate input
	if err := s.validateCreateInput(input); err != nil {
		return nil, err
	}

	// Create note
	n := &note.Note{
		UserID:              userID,
		Type:                input.Type,
		Title:               input.Title,
		Content:             input.Content,
		Format:              input.Format,
		Date:                input.Date,
		TaskID:              input.TaskID,
		MilestoneID:         input.MilestoneID,
		MilestoneName:       input.MilestoneName,
		GoalID:              input.GoalID,
		GoalName:            input.GoalName,
		GoalColor:           input.GoalColor,
		TagIDs:              input.TagIDs,
		RelatedTimeEntryIDs: input.RelatedTimeEntryIDs,
		FileURL:             input.FileURL,
		Archived:            false,
	}

	// Trim title if present
	if n.Title != nil {
		trimmed := strings.TrimSpace(*n.Title)
		n.Title = &trimmed
	}

	if err := s.repo.Create(ctx, n); err != nil {
		return nil, err
	}

	return n, nil
}

// Update updates an existing note
func (s *Service) Update(ctx context.Context, userID, noteID string, input *note.UpdateNoteInput) (*note.Note, error) {
	// Get existing note
	n, err := s.repo.GetByIDAndUserID(ctx, noteID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNoteNotFound) {
			return nil, ErrNoteNotFound
		}
		return nil, err
	}

	// Update fields
	if input.Title != nil {
		title := strings.TrimSpace(*input.Title)
		// Validate title for non-memo types
		if n.Type != note.NoteTypeMemo && title == "" {
			return nil, ErrTitleRequired
		}
		n.Title = &title
	}
	if input.Content != nil {
		n.Content = *input.Content
	}
	if input.Format != nil {
		if !input.Format.IsValid() {
			return nil, ErrInvalidFormat
		}
		n.Format = *input.Format
	}
	if input.Date != nil {
		n.Date = input.Date
	}
	if input.TaskID != nil {
		n.TaskID = input.TaskID
	}
	if input.MilestoneID != nil {
		n.MilestoneID = input.MilestoneID
	}
	if input.MilestoneName != nil {
		n.MilestoneName = input.MilestoneName
	}
	if input.GoalID != nil {
		n.GoalID = input.GoalID
	}
	if input.GoalName != nil {
		n.GoalName = input.GoalName
	}
	if input.GoalColor != nil {
		n.GoalColor = input.GoalColor
	}
	if input.TagIDs != nil {
		n.TagIDs = input.TagIDs
	}
	if input.RelatedTimeEntryIDs != nil {
		n.RelatedTimeEntryIDs = input.RelatedTimeEntryIDs
	}
	if input.FileURL != nil {
		n.FileURL = input.FileURL
	}
	if input.Archived != nil {
		n.Archived = *input.Archived
	}

	// Save changes
	if err := s.repo.Update(ctx, n); err != nil {
		return nil, err
	}

	return n, nil
}

// Delete deletes a note
func (s *Service) Delete(ctx context.Context, userID, noteID string) error {
	err := s.repo.DeleteByIDAndUserID(ctx, noteID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNoteNotFound) {
			return ErrNoteNotFound
		}
		return err
	}
	return nil
}

// Archive archives or unarchives a note
func (s *Service) Archive(ctx context.Context, userID, noteID string, archived bool) (*note.Note, error) {
	return s.Update(ctx, userID, noteID, &note.UpdateNoteInput{
		Archived: &archived,
	})
}

// Search performs a full-text search on notes
func (s *Service) Search(ctx context.Context, userID string, query string, filter *note.NoteFilter, limit int) ([]*note.SearchResult, error) {
	query = strings.TrimSpace(query)
	if query == "" {
		return nil, ErrQueryRequired
	}

	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	return s.repo.Search(ctx, userID, query, filter, limit)
}

// validateCreateInput validates the create input
func (s *Service) validateCreateInput(input *note.CreateNoteInput) error {
	// Validate type
	if input.Type == "" {
		return ErrTypeRequired
	}
	if !input.Type.IsValid() {
		return ErrInvalidType
	}

	// Validate title (required for diary and learning)
	if input.Type != note.NoteTypeMemo {
		if input.Title == nil || strings.TrimSpace(*input.Title) == "" {
			return ErrTitleRequired
		}
	}

	// Validate content
	if input.Content == "" {
		return ErrContentRequired
	}

	// Validate format
	if input.Format == "" {
		return ErrFormatRequired
	}
	if !input.Format.IsValid() {
		return ErrInvalidFormat
	}

	// Validate date (required for diary)
	if input.Type == note.NoteTypeDiary {
		if input.Date == nil || *input.Date == "" {
			return ErrDateRequired
		}
	}

	return nil
}
