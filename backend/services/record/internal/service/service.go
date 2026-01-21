package service

import (
	"context"
	"errors"
	"strings"

	"github.com/kensan/backend/services/record/internal"
	"github.com/kensan/backend/services/record/internal/repository"
)

var (
	ErrRecordNotFound    = errors.New("record not found")
	ErrTitleRequired     = errors.New("title is required")
	ErrContentRequired   = errors.New("content is required")
	ErrFormatRequired    = errors.New("format is required")
	ErrInvalidFormat     = errors.New("format must be markdown or drawio")
	ErrInvalidGoalTag    = errors.New("goal tag must be GK, OSS, Output, or Other")
	ErrQueryRequired     = errors.New("query is required for semantic search")
	ErrUnauthorized      = errors.New("not authorized to access this record")
)

// Service handles learning record business logic
type Service struct {
	repo repository.Repository
}

// NewService creates a new record service
func NewService(repo repository.Repository) *Service {
	return &Service{
		repo: repo,
	}
}

// List retrieves learning records for a user with optional filters
func (s *Service) List(ctx context.Context, userID string, filter *record.RecordFilter) ([]*record.LearningRecordListItem, error) {
	return s.repo.List(ctx, userID, filter)
}

// GetByID retrieves a learning record by ID (with content)
func (s *Service) GetByID(ctx context.Context, userID, recordID string) (*record.LearningRecord, error) {
	rec, err := s.repo.GetByIDAndUserID(ctx, recordID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrRecordNotFound) {
			return nil, ErrRecordNotFound
		}
		return nil, err
	}
	return rec, nil
}

// Create creates a new learning record
func (s *Service) Create(ctx context.Context, userID string, input *record.CreateRecordInput) (*record.LearningRecord, error) {
	// Validate input
	if err := s.validateCreateInput(input); err != nil {
		return nil, err
	}

	// Create record
	rec := &record.LearningRecord{
		UserID:              userID,
		Title:               strings.TrimSpace(input.Title),
		Content:             input.Content,
		Format:              input.Format,
		ProjectID:           input.ProjectID,
		ProjectName:         input.ProjectName,
		GoalTag:             input.GoalTag,
		RelatedTimeEntryIDs: input.RelatedTimeEntryIDs,
		FileURL:             input.FileURL,
	}

	if err := s.repo.Create(ctx, rec); err != nil {
		return nil, err
	}

	return rec, nil
}

// Update updates an existing learning record
func (s *Service) Update(ctx context.Context, userID, recordID string, input *record.UpdateRecordInput) (*record.LearningRecord, error) {
	// Get existing record
	rec, err := s.repo.GetByIDAndUserID(ctx, recordID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrRecordNotFound) {
			return nil, ErrRecordNotFound
		}
		return nil, err
	}

	// Validate and update fields
	if input.Title != nil {
		title := strings.TrimSpace(*input.Title)
		if title == "" {
			return nil, ErrTitleRequired
		}
		rec.Title = title
	}
	if input.Content != nil {
		rec.Content = *input.Content
	}
	if input.Format != nil {
		if !input.Format.IsValid() {
			return nil, ErrInvalidFormat
		}
		rec.Format = *input.Format
	}
	if input.ProjectID != nil {
		rec.ProjectID = input.ProjectID
	}
	if input.ProjectName != nil {
		rec.ProjectName = input.ProjectName
	}
	if input.GoalTag != nil {
		if !input.GoalTag.IsValid() {
			return nil, ErrInvalidGoalTag
		}
		rec.GoalTag = input.GoalTag
	}
	if input.RelatedTimeEntryIDs != nil {
		rec.RelatedTimeEntryIDs = input.RelatedTimeEntryIDs
	}
	if input.FileURL != nil {
		rec.FileURL = input.FileURL
	}

	// Save changes
	if err := s.repo.Update(ctx, rec); err != nil {
		return nil, err
	}

	return rec, nil
}

// Delete deletes a learning record
func (s *Service) Delete(ctx context.Context, userID, recordID string) error {
	err := s.repo.DeleteByIDAndUserID(ctx, recordID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrRecordNotFound) {
			return ErrRecordNotFound
		}
		return err
	}
	return nil
}

// SemanticSearch performs a semantic search on learning records
func (s *Service) SemanticSearch(ctx context.Context, userID string, input *record.SemanticSearchInput) ([]*record.SemanticSearchResult, error) {
	// Validate input
	query := strings.TrimSpace(input.Query)
	if query == "" {
		return nil, ErrQueryRequired
	}

	limit := input.Limit
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}

	return s.repo.SemanticSearch(ctx, userID, query, limit)
}

// validateCreateInput validates the create input
func (s *Service) validateCreateInput(input *record.CreateRecordInput) error {
	if strings.TrimSpace(input.Title) == "" {
		return ErrTitleRequired
	}
	if input.Content == "" {
		return ErrContentRequired
	}
	if input.Format == "" {
		return ErrFormatRequired
	}
	if !input.Format.IsValid() {
		return ErrInvalidFormat
	}
	if input.GoalTag != nil && !input.GoalTag.IsValid() {
		return ErrInvalidGoalTag
	}
	return nil
}
