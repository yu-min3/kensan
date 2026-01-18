package service

import (
	"context"
	"errors"
	"regexp"
	"strings"

	"github.com/kensan/backend/services/diary/internal"
	"github.com/kensan/backend/services/diary/internal/repository"
)

var (
	ErrDiaryNotFound  = errors.New("diary entry not found")
	ErrTitleRequired  = errors.New("title is required")
	ErrDateRequired   = errors.New("date is required")
	ErrInvalidDate    = errors.New("date must be in YYYY-MM-DD format")
	ErrUnauthorized   = errors.New("not authorized to access this diary entry")
)

// dateRegex validates YYYY-MM-DD format
var dateRegex = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)

// Service handles diary entry business logic
type Service struct {
	repo repository.Repository
}

// New creates a new diary service
func New(repo repository.Repository) *Service {
	return &Service{
		repo: repo,
	}
}

// List retrieves diary entries for a user with optional filters
func (s *Service) List(ctx context.Context, userID string, filter *diary.DiaryFilter) ([]*diary.DiaryEntryListItem, error) {
	return s.repo.List(ctx, userID, filter)
}

// GetByID retrieves a diary entry by ID
func (s *Service) GetByID(ctx context.Context, userID, diaryID string) (*diary.DiaryEntry, error) {
	entry, err := s.repo.GetByIDAndUserID(ctx, diaryID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrDiaryNotFound) {
			return nil, ErrDiaryNotFound
		}
		return nil, err
	}
	return entry, nil
}

// GetByDate retrieves a diary entry by date
func (s *Service) GetByDate(ctx context.Context, userID, date string) (*diary.DiaryEntry, error) {
	// Validate date format
	if !dateRegex.MatchString(date) {
		return nil, ErrInvalidDate
	}

	entry, err := s.repo.GetByDateAndUserID(ctx, date, userID)
	if err != nil {
		if errors.Is(err, repository.ErrDiaryNotFound) {
			return nil, ErrDiaryNotFound
		}
		return nil, err
	}
	return entry, nil
}

// Create creates a new diary entry
func (s *Service) Create(ctx context.Context, userID string, input *diary.CreateDiaryInput) (*diary.DiaryEntry, error) {
	// Validate input
	if err := s.validateCreateInput(input); err != nil {
		return nil, err
	}

	// Create entry
	entry := &diary.DiaryEntry{
		UserID:  userID,
		Date:    input.Date,
		Title:   strings.TrimSpace(input.Title),
		Content: input.Content,
		Tags:    input.Tags,
	}

	// Ensure tags is not nil
	if entry.Tags == nil {
		entry.Tags = []string{}
	}

	if err := s.repo.Create(ctx, entry); err != nil {
		return nil, err
	}

	return entry, nil
}

// Update updates an existing diary entry
func (s *Service) Update(ctx context.Context, userID, diaryID string, input *diary.UpdateDiaryInput) (*diary.DiaryEntry, error) {
	// Get existing entry
	entry, err := s.repo.GetByIDAndUserID(ctx, diaryID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrDiaryNotFound) {
			return nil, ErrDiaryNotFound
		}
		return nil, err
	}

	// Validate and update fields
	if input.Title != nil {
		title := strings.TrimSpace(*input.Title)
		if title == "" {
			return nil, ErrTitleRequired
		}
		entry.Title = title
	}
	if input.Content != nil {
		entry.Content = *input.Content
	}
	if input.Date != nil {
		if !dateRegex.MatchString(*input.Date) {
			return nil, ErrInvalidDate
		}
		entry.Date = *input.Date
	}
	if input.Tags != nil {
		entry.Tags = input.Tags
	}

	// Ensure tags is not nil
	if entry.Tags == nil {
		entry.Tags = []string{}
	}

	// Save changes
	if err := s.repo.Update(ctx, entry); err != nil {
		return nil, err
	}

	return entry, nil
}

// Delete deletes a diary entry
func (s *Service) Delete(ctx context.Context, userID, diaryID string) error {
	err := s.repo.DeleteByIDAndUserID(ctx, diaryID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrDiaryNotFound) {
			return ErrDiaryNotFound
		}
		return err
	}
	return nil
}

// validateCreateInput validates the create input
func (s *Service) validateCreateInput(input *diary.CreateDiaryInput) error {
	if strings.TrimSpace(input.Title) == "" {
		return ErrTitleRequired
	}
	if input.Date == "" {
		return ErrDateRequired
	}
	if !dateRegex.MatchString(input.Date) {
		return ErrInvalidDate
	}
	return nil
}
