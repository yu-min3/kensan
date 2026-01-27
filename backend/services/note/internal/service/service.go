package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/kensan/backend/services/note/internal"
	"github.com/kensan/backend/services/note/internal/repository"
	"github.com/kensan/backend/services/note/internal/storage"
)

var (
	ErrNoteNotFound       = errors.New("note not found")
	ErrTypeRequired       = errors.New("type is required")
	ErrInvalidType        = errors.New("type must be diary or learning")
	ErrTitleRequired      = errors.New("title is required")
	ErrContentRequired    = errors.New("content is required")
	ErrFormatRequired     = errors.New("format is required")
	ErrInvalidFormat      = errors.New("format must be markdown or drawio")
	ErrDateRequired       = errors.New("date is required for diary notes")
	ErrQueryRequired      = errors.New("query is required for search")
	ErrUnauthorized       = errors.New("not authorized to access this note")
	ErrStorageUnavailable = errors.New("storage is not configured")
)

// StorageClient interface for storage operations
type StorageClient interface {
	GetPresignedUploadURL(ctx context.Context, key string, expiry time.Duration) (string, error)
	GetPresignedDownloadURL(ctx context.Context, key string, expiry time.Duration) (string, error)
	Delete(ctx context.Context, key string) error
}

// Service handles note business logic
type Service struct {
	repo    repository.Repository
	storage StorageClient
}

// NewService creates a new note service
func NewService(repo repository.Repository, storageClient *storage.Client) *Service {
	var sc StorageClient
	if storageClient != nil {
		sc = storageClient
	}
	return &Service{
		repo:    repo,
		storage: sc,
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

	// Convert metadata input to metadata items
	var metadataItems []note.NoteMetadataItem
	if len(input.Metadata) > 0 {
		metadataItems = make([]note.NoteMetadataItem, len(input.Metadata))
		for i, m := range input.Metadata {
			metadataItems[i] = note.NoteMetadataItem{Key: m.Key, Value: m.Value}
		}
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
		Metadata:            metadataItems,
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
		// Title is always required for notes
		if title == "" {
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
		n.Date = *input.Date
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
	if input.Metadata != nil {
		metadataItems := make([]note.NoteMetadataItem, len(input.Metadata))
		for i, m := range input.Metadata {
			metadataItems[i] = note.NoteMetadataItem{Key: m.Key, Value: m.Value}
		}
		n.Metadata = metadataItems
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

	// Validate title (always required)
	if input.Title == nil || strings.TrimSpace(*input.Title) == "" {
		return ErrTitleRequired
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

	// Validate date (required for diary and learning)
	if input.Type == note.NoteTypeDiary || input.Type == note.NoteTypeLearning {
		if !input.Date.Valid {
			return ErrDateRequired
		}
	}

	return nil
}

// ========== NoteContent Operations ==========

var (
	ErrContentNotFound     = errors.New("content not found")
	ErrContentTypeRequired = errors.New("content type is required")
	ErrInvalidContentType  = errors.New("invalid content type")
)

// ListContents retrieves all contents for a note
func (s *Service) ListContents(ctx context.Context, userID, noteID string) ([]*note.NoteContent, error) {
	// Verify note belongs to user
	_, err := s.repo.GetByIDAndUserID(ctx, noteID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNoteNotFound) {
			return nil, ErrNoteNotFound
		}
		return nil, err
	}

	return s.repo.ListContents(ctx, noteID)
}

// GetContent retrieves a content by ID
func (s *Service) GetContent(ctx context.Context, userID, noteID, contentID string) (*note.NoteContent, error) {
	// Verify note belongs to user
	_, err := s.repo.GetByIDAndUserID(ctx, noteID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNoteNotFound) {
			return nil, ErrNoteNotFound
		}
		return nil, err
	}

	content, err := s.repo.GetContent(ctx, contentID)
	if err != nil {
		return nil, err
	}
	if content == nil || content.NoteID != noteID {
		return nil, ErrContentNotFound
	}

	return content, nil
}

// CreateContent creates a new note content
func (s *Service) CreateContent(ctx context.Context, userID, noteID string, input *note.CreateNoteContentInput) (*note.NoteContent, error) {
	// Verify note belongs to user
	_, err := s.repo.GetByIDAndUserID(ctx, noteID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNoteNotFound) {
			return nil, ErrNoteNotFound
		}
		return nil, err
	}

	// Validate input
	if err := s.validateContentInput(input); err != nil {
		return nil, err
	}

	// Determine sort order
	sortOrder := 0
	if input.SortOrder != nil {
		sortOrder = *input.SortOrder
	} else {
		// Get current max sort order
		contents, err := s.repo.ListContents(ctx, noteID)
		if err == nil && len(contents) > 0 {
			sortOrder = contents[len(contents)-1].SortOrder + 1
		}
	}

	content := &note.NoteContent{
		NoteID:          noteID,
		ContentType:     input.ContentType,
		Content:         input.Content,
		StorageProvider: input.StorageProvider,
		StorageKey:      input.StorageKey,
		FileName:        input.FileName,
		MimeType:        input.MimeType,
		FileSizeBytes:   input.FileSizeBytes,
		Checksum:        input.Checksum,
		ThumbnailBase64: input.ThumbnailBase64,
		SortOrder:       sortOrder,
		Metadata:        input.Metadata,
	}

	if err := s.repo.CreateContent(ctx, content); err != nil {
		return nil, err
	}

	// Mark note as needing reindexing
	_ = s.repo.UpdateIndexStatus(ctx, noteID, note.IndexStatusPending)

	return content, nil
}

// UpdateContent updates an existing note content
func (s *Service) UpdateContent(ctx context.Context, userID, noteID, contentID string, input *note.UpdateNoteContentInput) (*note.NoteContent, error) {
	// Verify note belongs to user
	_, err := s.repo.GetByIDAndUserID(ctx, noteID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNoteNotFound) {
			return nil, ErrNoteNotFound
		}
		return nil, err
	}

	// Get existing content
	content, err := s.repo.GetContent(ctx, contentID)
	if err != nil {
		return nil, err
	}
	if content == nil || content.NoteID != noteID {
		return nil, ErrContentNotFound
	}

	// Update fields
	if input.Content != nil {
		content.Content = input.Content
	}
	if input.SortOrder != nil {
		content.SortOrder = *input.SortOrder
	}
	if input.Metadata != nil {
		content.Metadata = input.Metadata
	}
	if input.ThumbnailBase64 != nil {
		content.ThumbnailBase64 = input.ThumbnailBase64
	}

	if err := s.repo.UpdateContent(ctx, content); err != nil {
		return nil, err
	}

	// Mark note as needing reindexing
	_ = s.repo.UpdateIndexStatus(ctx, noteID, note.IndexStatusPending)

	return content, nil
}

// DeleteContent deletes a note content
func (s *Service) DeleteContent(ctx context.Context, userID, noteID, contentID string) error {
	// Verify note belongs to user
	_, err := s.repo.GetByIDAndUserID(ctx, noteID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNoteNotFound) {
			return ErrNoteNotFound
		}
		return err
	}

	// Verify content belongs to note
	content, err := s.repo.GetContent(ctx, contentID)
	if err != nil {
		return err
	}
	if content == nil || content.NoteID != noteID {
		return ErrContentNotFound
	}

	if err := s.repo.DeleteContent(ctx, contentID); err != nil {
		return err
	}

	// Mark note as needing reindexing
	_ = s.repo.UpdateIndexStatus(ctx, noteID, note.IndexStatusPending)

	return nil
}

// ReorderContents updates the sort order of contents
func (s *Service) ReorderContents(ctx context.Context, userID, noteID string, contentIDs []string) error {
	// Verify note belongs to user
	_, err := s.repo.GetByIDAndUserID(ctx, noteID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNoteNotFound) {
			return ErrNoteNotFound
		}
		return err
	}

	return s.repo.ReorderContents(ctx, noteID, contentIDs)
}

// validateContentInput validates content input
func (s *Service) validateContentInput(input *note.CreateNoteContentInput) error {
	if input.ContentType == "" {
		return ErrContentTypeRequired
	}
	if !input.ContentType.IsValid() {
		return ErrInvalidContentType
	}
	return nil
}

// GetUploadURL generates a presigned URL for uploading content to storage
func (s *Service) GetUploadURL(ctx context.Context, userID, noteID string, req *note.UploadURLRequest) (*note.UploadURLResponse, error) {
	// Verify note belongs to user
	_, err := s.repo.GetByIDAndUserID(ctx, noteID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNoteNotFound) {
			return nil, ErrNoteNotFound
		}
		return nil, err
	}

	// Check storage is available
	if s.storage == nil {
		return nil, ErrStorageUnavailable
	}

	// Generate content ID and storage key
	contentID := uuid.New().String()
	storageKey := storage.GenerateKey(noteID, contentID, getExtensionFromMimeType(req.MimeType))

	// Generate presigned URL (valid for 15 minutes)
	uploadURL, err := s.storage.GetPresignedUploadURL(ctx, storageKey, 15*time.Minute)
	if err != nil {
		return nil, err
	}

	return &note.UploadURLResponse{
		UploadURL:  uploadURL,
		ContentID:  contentID,
		StorageKey: storageKey,
	}, nil
}

// GetDownloadURL generates a presigned URL for downloading content from storage
func (s *Service) GetDownloadURL(ctx context.Context, userID, noteID, contentID string) (string, error) {
	// Verify note belongs to user
	_, err := s.repo.GetByIDAndUserID(ctx, noteID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNoteNotFound) {
			return "", ErrNoteNotFound
		}
		return "", err
	}

	// Get content
	content, err := s.repo.GetContent(ctx, contentID)
	if err != nil {
		return "", err
	}
	if content == nil || content.NoteID != noteID {
		return "", ErrContentNotFound
	}

	// Check storage key exists
	if content.StorageKey == nil || *content.StorageKey == "" {
		return "", errors.New("content is not stored in external storage")
	}

	// Check storage is available
	if s.storage == nil {
		return "", ErrStorageUnavailable
	}

	// Generate presigned URL (valid for 1 hour)
	return s.storage.GetPresignedDownloadURL(ctx, *content.StorageKey, time.Hour)
}

// getExtensionFromMimeType returns file extension from MIME type
func getExtensionFromMimeType(mimeType string) string {
	switch mimeType {
	case "text/markdown", "text/x-markdown":
		return ".md"
	case "application/xml", "text/xml":
		return ".drawio"
	case "image/png":
		return ".png"
	case "image/jpeg":
		return ".jpg"
	case "image/gif":
		return ".gif"
	case "image/webp":
		return ".webp"
	case "application/pdf":
		return ".pdf"
	default:
		return ""
	}
}
