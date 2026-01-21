package service

import (
	"context"
	"testing"

	"github.com/kensan/backend/services/diary/internal"
	"github.com/kensan/backend/services/diary/internal/repository"
	"github.com/kensan/backend/shared/validation"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockRepository is a mock implementation of repository.Repository
type MockRepository struct {
	mock.Mock
}

// Ensure MockRepository implements repository.Repository
var _ repository.Repository = (*MockRepository)(nil)

func (m *MockRepository) GetByID(ctx context.Context, id string) (*diary.DiaryEntry, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*diary.DiaryEntry), args.Error(1)
}

func (m *MockRepository) GetByIDAndUserID(ctx context.Context, id, userID string) (*diary.DiaryEntry, error) {
	args := m.Called(ctx, id, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*diary.DiaryEntry), args.Error(1)
}

func (m *MockRepository) GetByDateAndUserID(ctx context.Context, date, userID string) (*diary.DiaryEntry, error) {
	args := m.Called(ctx, date, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*diary.DiaryEntry), args.Error(1)
}

func (m *MockRepository) List(ctx context.Context, userID string, filter *diary.DiaryFilter) ([]*diary.DiaryEntryListItem, error) {
	args := m.Called(ctx, userID, filter)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*diary.DiaryEntryListItem), args.Error(1)
}

func (m *MockRepository) Create(ctx context.Context, entry *diary.DiaryEntry) error {
	args := m.Called(ctx, entry)
	// Simulate ID generation
	if entry != nil && entry.ID == "" {
		entry.ID = "diary-new-123"
	}
	return args.Error(0)
}

func (m *MockRepository) Update(ctx context.Context, entry *diary.DiaryEntry) error {
	args := m.Called(ctx, entry)
	return args.Error(0)
}

func (m *MockRepository) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockRepository) DeleteByIDAndUserID(ctx context.Context, id, userID string) error {
	args := m.Called(ctx, id, userID)
	return args.Error(0)
}

// ========== Date Validation Tests ==========

func TestDateValidation(t *testing.T) {
	testCases := []struct {
		date     string
		expected bool
	}{
		{"2024-01-01", true},
		{"2024-12-31", true},
		{"2024-06-15", true},
		{"24-01-01", false},
		{"2024/01/01", false},
		{"2024-1-1", false},
		{"invalid", false},
		{"", false},
	}

	for _, tc := range testCases {
		t.Run(tc.date, func(t *testing.T) {
			result := validation.IsValidDate(tc.date)
			assert.Equal(t, tc.expected, result)
		})
	}
}

// ========== List Tests ==========

func TestService_List_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	expectedEntries := []*diary.DiaryEntryListItem{
		{ID: "d1", Title: "Day 1", Date: "2024-01-01"},
		{ID: "d2", Title: "Day 2", Date: "2024-01-02"},
	}

	mockRepo.On("List", ctx, userID, (*diary.DiaryFilter)(nil)).Return(expectedEntries, nil)

	result, err := svc.List(ctx, userID, nil)

	assert.NoError(t, err)
	assert.Len(t, result, 2)
	assert.Equal(t, "Day 1", result[0].Title)
	mockRepo.AssertExpectations(t)
}

func TestService_List_WithDateFilter(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	startDate := "2024-01-01"
	endDate := "2024-01-31"

	filter := &diary.DiaryFilter{
		StartDate: &startDate,
		EndDate:   &endDate,
	}

	expectedEntries := []*diary.DiaryEntryListItem{
		{ID: "d1", Title: "January Entry", Date: "2024-01-15"},
	}

	mockRepo.On("List", ctx, userID, filter).Return(expectedEntries, nil)

	result, err := svc.List(ctx, userID, filter)

	assert.NoError(t, err)
	assert.Len(t, result, 1)
	mockRepo.AssertExpectations(t)
}

// ========== GetByID Tests ==========

func TestService_GetByID_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	diaryID := "diary-123"

	expectedEntry := &diary.DiaryEntry{
		ID:      diaryID,
		UserID:  userID,
		Title:   "Test Entry",
		Content: "# Hello\nThis is a test",
		Date:    "2024-01-15",
		Tags:    []string{"test", "sample"},
	}

	mockRepo.On("GetByIDAndUserID", ctx, diaryID, userID).Return(expectedEntry, nil)

	result, err := svc.GetByID(ctx, userID, diaryID)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "Test Entry", result.Title)
	assert.Len(t, result.Tags, 2)
	mockRepo.AssertExpectations(t)
}

func TestService_GetByID_NotFound(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	diaryID := "nonexistent"

	mockRepo.On("GetByIDAndUserID", ctx, diaryID, userID).Return(nil, repository.ErrDiaryNotFound)

	result, err := svc.GetByID(ctx, userID, diaryID)

	assert.ErrorIs(t, err, ErrDiaryNotFound)
	assert.Nil(t, result)
	mockRepo.AssertExpectations(t)
}

// ========== GetByDate Tests ==========

func TestService_GetByDate_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	date := "2024-01-15"

	expectedEntry := &diary.DiaryEntry{
		ID:     "diary-123",
		UserID: userID,
		Title:  "January 15th",
		Date:   date,
	}

	mockRepo.On("GetByDateAndUserID", ctx, date, userID).Return(expectedEntry, nil)

	result, err := svc.GetByDate(ctx, userID, date)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, date, result.Date)
	mockRepo.AssertExpectations(t)
}

func TestService_GetByDate_InvalidDateFormat(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	invalidDate := "01-15-2024"

	result, err := svc.GetByDate(ctx, userID, invalidDate)

	assert.ErrorIs(t, err, ErrInvalidDate)
	assert.Nil(t, result)
	// Repository should not be called for invalid date
	mockRepo.AssertNotCalled(t, "GetByDateAndUserID")
}

// ========== Create Tests ==========

func TestService_Create_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	input := &diary.CreateDiaryInput{
		Date:    "2024-01-15",
		Title:   "New Entry",
		Content: "Content here",
		Tags:    []string{"new"},
	}

	mockRepo.On("Create", ctx, mock.AnythingOfType("*diary.DiaryEntry")).Return(nil)

	result, err := svc.Create(ctx, userID, input)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.NotEmpty(t, result.ID)
	assert.Equal(t, userID, result.UserID)
	assert.Equal(t, "New Entry", result.Title)
	assert.Equal(t, "2024-01-15", result.Date)
	mockRepo.AssertExpectations(t)
}

func TestService_Create_TitleRequired(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	input := &diary.CreateDiaryInput{
		Date:    "2024-01-15",
		Title:   "",
		Content: "Content here",
	}

	result, err := svc.Create(ctx, userID, input)

	assert.ErrorIs(t, err, ErrTitleRequired)
	assert.Nil(t, result)
	mockRepo.AssertNotCalled(t, "Create")
}

func TestService_Create_DateRequired(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	input := &diary.CreateDiaryInput{
		Date:    "",
		Title:   "Title",
		Content: "Content here",
	}

	result, err := svc.Create(ctx, userID, input)

	assert.ErrorIs(t, err, ErrDateRequired)
	assert.Nil(t, result)
	mockRepo.AssertNotCalled(t, "Create")
}

func TestService_Create_InvalidDateFormat(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	input := &diary.CreateDiaryInput{
		Date:    "01-15-2024",
		Title:   "Title",
		Content: "Content here",
	}

	result, err := svc.Create(ctx, userID, input)

	assert.ErrorIs(t, err, ErrInvalidDate)
	assert.Nil(t, result)
	mockRepo.AssertNotCalled(t, "Create")
}

// ========== Update Tests ==========

func TestService_Update_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	diaryID := "diary-123"

	existingEntry := &diary.DiaryEntry{
		ID:      diaryID,
		UserID:  userID,
		Title:   "Original Title",
		Content: "Original content",
		Date:    "2024-01-15",
		Tags:    []string{"original"},
	}

	newTitle := "Updated Title"
	input := &diary.UpdateDiaryInput{
		Title: &newTitle,
	}

	mockRepo.On("GetByIDAndUserID", ctx, diaryID, userID).Return(existingEntry, nil)
	mockRepo.On("Update", ctx, mock.AnythingOfType("*diary.DiaryEntry")).Return(nil)

	result, err := svc.Update(ctx, userID, diaryID, input)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "Updated Title", result.Title)
	mockRepo.AssertExpectations(t)
}

func TestService_Update_NotFound(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	diaryID := "nonexistent"

	newTitle := "Updated Title"
	input := &diary.UpdateDiaryInput{
		Title: &newTitle,
	}

	mockRepo.On("GetByIDAndUserID", ctx, diaryID, userID).Return(nil, repository.ErrDiaryNotFound)

	result, err := svc.Update(ctx, userID, diaryID, input)

	assert.ErrorIs(t, err, ErrDiaryNotFound)
	assert.Nil(t, result)
	mockRepo.AssertNotCalled(t, "Update")
}

func TestService_Update_EmptyTitle(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	diaryID := "diary-123"

	existingEntry := &diary.DiaryEntry{
		ID:     diaryID,
		UserID: userID,
		Title:  "Original Title",
		Date:   "2024-01-15",
	}

	emptyTitle := ""
	input := &diary.UpdateDiaryInput{
		Title: &emptyTitle,
	}

	mockRepo.On("GetByIDAndUserID", ctx, diaryID, userID).Return(existingEntry, nil)

	result, err := svc.Update(ctx, userID, diaryID, input)

	assert.ErrorIs(t, err, ErrTitleRequired)
	assert.Nil(t, result)
	mockRepo.AssertNotCalled(t, "Update")
}

// ========== Delete Tests ==========

func TestService_Delete_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	diaryID := "diary-123"

	mockRepo.On("DeleteByIDAndUserID", ctx, diaryID, userID).Return(nil)

	err := svc.Delete(ctx, userID, diaryID)

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestService_Delete_NotFound(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	diaryID := "nonexistent"

	mockRepo.On("DeleteByIDAndUserID", ctx, diaryID, userID).Return(repository.ErrDiaryNotFound)

	err := svc.Delete(ctx, userID, diaryID)

	assert.ErrorIs(t, err, ErrDiaryNotFound)
	mockRepo.AssertExpectations(t)
}

