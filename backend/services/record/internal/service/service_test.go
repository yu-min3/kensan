package service

import (
	"context"
	"errors"
	"testing"

	"github.com/kensan/backend/services/record/internal"
	"github.com/kensan/backend/services/record/internal/repository"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockRepository is a mock implementation of the record repository
type MockRepository struct {
	mock.Mock
}

// Compile-time check that MockRepository implements repository.Repository
var _ repository.Repository = (*MockRepository)(nil)

func (m *MockRepository) GetByID(ctx context.Context, id string) (*record.LearningRecord, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*record.LearningRecord), args.Error(1)
}

func (m *MockRepository) GetByIDAndUserID(ctx context.Context, id, userID string) (*record.LearningRecord, error) {
	args := m.Called(ctx, id, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*record.LearningRecord), args.Error(1)
}

func (m *MockRepository) List(ctx context.Context, userID string, filter *record.RecordFilter) ([]*record.LearningRecordListItem, error) {
	args := m.Called(ctx, userID, filter)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*record.LearningRecordListItem), args.Error(1)
}

func (m *MockRepository) Create(ctx context.Context, rec *record.LearningRecord) error {
	args := m.Called(ctx, rec)
	if rec != nil && rec.ID == "" {
		rec.ID = "record-new"
	}
	return args.Error(0)
}

func (m *MockRepository) Update(ctx context.Context, rec *record.LearningRecord) error {
	args := m.Called(ctx, rec)
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

func (m *MockRepository) SemanticSearch(ctx context.Context, userID, query string, limit int) ([]*record.SemanticSearchResult, error) {
	args := m.Called(ctx, userID, query, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*record.SemanticSearchResult), args.Error(1)
}

// ========== RecordFormat Validation Tests ==========

func TestRecordFormat_IsValid(t *testing.T) {
	testCases := []struct {
		format   record.RecordFormat
		expected bool
	}{
		{record.RecordFormatMarkdown, true},
		{record.RecordFormatDrawio, true},
		{record.RecordFormat("invalid"), false},
		{record.RecordFormat(""), false},
	}

	for _, tc := range testCases {
		t.Run(string(tc.format), func(t *testing.T) {
			assert.Equal(t, tc.expected, tc.format.IsValid())
		})
	}
}

// ========== GoalTag Validation Tests ==========

func TestGoalTag_IsValid(t *testing.T) {
	testCases := []struct {
		tag      record.GoalTag
		expected bool
	}{
		{record.GoalTagGK, true},
		{record.GoalTagOSS, true},
		{record.GoalTagOutput, true},
		{record.GoalTagOther, true},
		{record.GoalTag("invalid"), false},
		{record.GoalTag(""), false},
	}

	for _, tc := range testCases {
		t.Run(string(tc.tag), func(t *testing.T) {
			assert.Equal(t, tc.expected, tc.tag.IsValid())
		})
	}
}

// ========== List Tests ==========

func TestService_List_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	expectedRecords := []*record.LearningRecordListItem{
		{ID: "r1", Title: "Kubernetes Basics", Format: record.RecordFormatMarkdown},
		{ID: "r2", Title: "Go Patterns", Format: record.RecordFormatMarkdown},
	}

	mockRepo.On("List", ctx, userID, (*record.RecordFilter)(nil)).Return(expectedRecords, nil)

	result, err := svc.List(ctx, userID, nil)

	assert.NoError(t, err)
	assert.Len(t, result, 2)
	assert.Equal(t, "Kubernetes Basics", result[0].Title)
	mockRepo.AssertExpectations(t)
}

func TestService_List_WithGoalTagFilter(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	goalTag := record.GoalTagGK

	filter := &record.RecordFilter{
		GoalTag: &goalTag,
	}

	expectedRecords := []*record.LearningRecordListItem{
		{ID: "r1", Title: "GK Study", GoalTag: &goalTag},
	}

	mockRepo.On("List", ctx, userID, filter).Return(expectedRecords, nil)

	result, err := svc.List(ctx, userID, filter)

	assert.NoError(t, err)
	assert.Len(t, result, 1)
	assert.Equal(t, &goalTag, result[0].GoalTag)
	mockRepo.AssertExpectations(t)
}

func TestService_List_RepositoryError(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	mockRepo.On("List", ctx, userID, (*record.RecordFilter)(nil)).Return(nil, errors.New("database error"))

	result, err := svc.List(ctx, userID, nil)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Equal(t, "database error", err.Error())
	mockRepo.AssertExpectations(t)
}

// ========== GetByID Tests ==========

func TestService_GetByID_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	recordID := "record-123"

	expectedRecord := &record.LearningRecord{
		ID:      recordID,
		UserID:  userID,
		Title:   "Test Record",
		Content: "# Learning Notes\n\nSome content here...",
		Format:  record.RecordFormatMarkdown,
	}

	mockRepo.On("GetByIDAndUserID", ctx, recordID, userID).Return(expectedRecord, nil)

	result, err := svc.GetByID(ctx, userID, recordID)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "Test Record", result.Title)
	assert.NotEmpty(t, result.Content)
	mockRepo.AssertExpectations(t)
}

func TestService_GetByID_NotFound(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	recordID := "nonexistent"

	mockRepo.On("GetByIDAndUserID", ctx, recordID, userID).Return(nil, repository.ErrRecordNotFound)

	result, err := svc.GetByID(ctx, userID, recordID)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.ErrorIs(t, err, ErrRecordNotFound)
	mockRepo.AssertExpectations(t)
}

func TestService_GetByID_RepositoryError(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	recordID := "record-123"

	mockRepo.On("GetByIDAndUserID", ctx, recordID, userID).Return(nil, errors.New("database error"))

	result, err := svc.GetByID(ctx, userID, recordID)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Equal(t, "database error", err.Error())
	mockRepo.AssertExpectations(t)
}

// ========== Create Tests ==========

func TestService_Create_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	goalTag := record.GoalTagGK

	input := &record.CreateRecordInput{
		Title:   "New Learning Record",
		Content: "# Content\n\nDetails here",
		Format:  record.RecordFormatMarkdown,
		GoalTag: &goalTag,
	}

	mockRepo.On("Create", ctx, mock.AnythingOfType("*record.LearningRecord")).Return(nil)

	result, err := svc.Create(ctx, userID, input)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, userID, result.UserID)
	assert.Equal(t, "New Learning Record", result.Title)
	assert.Equal(t, record.RecordFormatMarkdown, result.Format)
	assert.NotEmpty(t, result.ID)
	mockRepo.AssertExpectations(t)
}

func TestService_Create_TitleRequired(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	input := &record.CreateRecordInput{
		Title:   "",
		Content: "# Content",
		Format:  record.RecordFormatMarkdown,
	}

	result, err := svc.Create(ctx, userID, input)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.ErrorIs(t, err, ErrTitleRequired)
	mockRepo.AssertNotCalled(t, "Create")
}

func TestService_Create_TitleWhitespaceOnly(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	input := &record.CreateRecordInput{
		Title:   "   ",
		Content: "# Content",
		Format:  record.RecordFormatMarkdown,
	}

	result, err := svc.Create(ctx, userID, input)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.ErrorIs(t, err, ErrTitleRequired)
	mockRepo.AssertNotCalled(t, "Create")
}

func TestService_Create_ContentRequired(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	input := &record.CreateRecordInput{
		Title:   "Valid Title",
		Content: "",
		Format:  record.RecordFormatMarkdown,
	}

	result, err := svc.Create(ctx, userID, input)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.ErrorIs(t, err, ErrContentRequired)
	mockRepo.AssertNotCalled(t, "Create")
}

func TestService_Create_FormatRequired(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	input := &record.CreateRecordInput{
		Title:   "Valid Title",
		Content: "Some content",
		Format:  "",
	}

	result, err := svc.Create(ctx, userID, input)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.ErrorIs(t, err, ErrFormatRequired)
	mockRepo.AssertNotCalled(t, "Create")
}

func TestService_Create_InvalidFormat(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	input := &record.CreateRecordInput{
		Title:   "Valid Title",
		Content: "Some content",
		Format:  record.RecordFormat("pdf"),
	}

	result, err := svc.Create(ctx, userID, input)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.ErrorIs(t, err, ErrInvalidFormat)
	mockRepo.AssertNotCalled(t, "Create")
}

func TestService_Create_InvalidGoalTag(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	invalidTag := record.GoalTag("invalid")

	input := &record.CreateRecordInput{
		Title:   "Valid Title",
		Content: "Some content",
		Format:  record.RecordFormatMarkdown,
		GoalTag: &invalidTag,
	}

	result, err := svc.Create(ctx, userID, input)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.ErrorIs(t, err, ErrInvalidGoalTag)
	mockRepo.AssertNotCalled(t, "Create")
}

func TestService_Create_RepositoryError(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	input := &record.CreateRecordInput{
		Title:   "Valid Title",
		Content: "Some content",
		Format:  record.RecordFormatMarkdown,
	}

	mockRepo.On("Create", ctx, mock.AnythingOfType("*record.LearningRecord")).Return(errors.New("database error"))

	result, err := svc.Create(ctx, userID, input)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Equal(t, "database error", err.Error())
	mockRepo.AssertExpectations(t)
}

// ========== Update Tests ==========

func TestService_Update_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	recordID := "record-123"
	newTitle := "Updated Title"

	existingRecord := &record.LearningRecord{
		ID:      recordID,
		UserID:  userID,
		Title:   "Original Title",
		Content: "Original content",
		Format:  record.RecordFormatMarkdown,
	}

	input := &record.UpdateRecordInput{
		Title: &newTitle,
	}

	mockRepo.On("GetByIDAndUserID", ctx, recordID, userID).Return(existingRecord, nil)
	mockRepo.On("Update", ctx, mock.AnythingOfType("*record.LearningRecord")).Return(nil)

	result, err := svc.Update(ctx, userID, recordID, input)

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
	recordID := "nonexistent"
	newTitle := "Updated Title"

	input := &record.UpdateRecordInput{
		Title: &newTitle,
	}

	mockRepo.On("GetByIDAndUserID", ctx, recordID, userID).Return(nil, repository.ErrRecordNotFound)

	result, err := svc.Update(ctx, userID, recordID, input)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.ErrorIs(t, err, ErrRecordNotFound)
	mockRepo.AssertNotCalled(t, "Update")
}

func TestService_Update_EmptyTitle(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	recordID := "record-123"
	emptyTitle := ""

	existingRecord := &record.LearningRecord{
		ID:      recordID,
		UserID:  userID,
		Title:   "Original Title",
		Content: "Original content",
		Format:  record.RecordFormatMarkdown,
	}

	input := &record.UpdateRecordInput{
		Title: &emptyTitle,
	}

	mockRepo.On("GetByIDAndUserID", ctx, recordID, userID).Return(existingRecord, nil)

	result, err := svc.Update(ctx, userID, recordID, input)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.ErrorIs(t, err, ErrTitleRequired)
	mockRepo.AssertNotCalled(t, "Update")
}

func TestService_Update_InvalidFormat(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	recordID := "record-123"
	invalidFormat := record.RecordFormat("invalid")

	existingRecord := &record.LearningRecord{
		ID:      recordID,
		UserID:  userID,
		Title:   "Original Title",
		Content: "Original content",
		Format:  record.RecordFormatMarkdown,
	}

	input := &record.UpdateRecordInput{
		Format: &invalidFormat,
	}

	mockRepo.On("GetByIDAndUserID", ctx, recordID, userID).Return(existingRecord, nil)

	result, err := svc.Update(ctx, userID, recordID, input)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.ErrorIs(t, err, ErrInvalidFormat)
	mockRepo.AssertNotCalled(t, "Update")
}

func TestService_Update_InvalidGoalTag(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	recordID := "record-123"
	invalidTag := record.GoalTag("invalid")

	existingRecord := &record.LearningRecord{
		ID:      recordID,
		UserID:  userID,
		Title:   "Original Title",
		Content: "Original content",
		Format:  record.RecordFormatMarkdown,
	}

	input := &record.UpdateRecordInput{
		GoalTag: &invalidTag,
	}

	mockRepo.On("GetByIDAndUserID", ctx, recordID, userID).Return(existingRecord, nil)

	result, err := svc.Update(ctx, userID, recordID, input)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.ErrorIs(t, err, ErrInvalidGoalTag)
	mockRepo.AssertNotCalled(t, "Update")
}

// ========== Delete Tests ==========

func TestService_Delete_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	recordID := "record-123"

	mockRepo.On("DeleteByIDAndUserID", ctx, recordID, userID).Return(nil)

	err := svc.Delete(ctx, userID, recordID)

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestService_Delete_NotFound(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	recordID := "nonexistent"

	mockRepo.On("DeleteByIDAndUserID", ctx, recordID, userID).Return(repository.ErrRecordNotFound)

	err := svc.Delete(ctx, userID, recordID)

	assert.Error(t, err)
	assert.ErrorIs(t, err, ErrRecordNotFound)
	mockRepo.AssertExpectations(t)
}

func TestService_Delete_RepositoryError(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	recordID := "record-123"

	mockRepo.On("DeleteByIDAndUserID", ctx, recordID, userID).Return(errors.New("database error"))

	err := svc.Delete(ctx, userID, recordID)

	assert.Error(t, err)
	assert.Equal(t, "database error", err.Error())
	mockRepo.AssertExpectations(t)
}

// ========== Semantic Search Tests ==========

func TestService_SemanticSearch_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	input := &record.SemanticSearchInput{
		Query: "kubernetes deployment",
		Limit: 10,
	}

	expectedResults := []*record.SemanticSearchResult{
		{
			Record: &record.LearningRecordListItem{
				ID:    "r1",
				Title: "Kubernetes Deployment Patterns",
			},
			Score: 0.95,
		},
		{
			Record: &record.LearningRecordListItem{
				ID:    "r2",
				Title: "K8s Basics",
			},
			Score: 0.80,
		},
	}

	mockRepo.On("SemanticSearch", ctx, userID, "kubernetes deployment", 10).Return(expectedResults, nil)

	result, err := svc.SemanticSearch(ctx, userID, input)

	assert.NoError(t, err)
	assert.Len(t, result, 2)
	assert.Greater(t, result[0].Score, result[1].Score)
	mockRepo.AssertExpectations(t)
}

func TestService_SemanticSearch_EmptyQuery(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	input := &record.SemanticSearchInput{
		Query: "",
		Limit: 10,
	}

	result, err := svc.SemanticSearch(ctx, userID, input)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.ErrorIs(t, err, ErrQueryRequired)
	mockRepo.AssertNotCalled(t, "SemanticSearch")
}

func TestService_SemanticSearch_WhitespaceQuery(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	input := &record.SemanticSearchInput{
		Query: "   ",
		Limit: 10,
	}

	result, err := svc.SemanticSearch(ctx, userID, input)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.ErrorIs(t, err, ErrQueryRequired)
	mockRepo.AssertNotCalled(t, "SemanticSearch")
}

func TestService_SemanticSearch_DefaultLimit(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	input := &record.SemanticSearchInput{
		Query: "test query",
		Limit: 0,
	}

	expectedResults := []*record.SemanticSearchResult{}

	// Default limit should be 10
	mockRepo.On("SemanticSearch", ctx, userID, "test query", 10).Return(expectedResults, nil)

	result, err := svc.SemanticSearch(ctx, userID, input)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	mockRepo.AssertExpectations(t)
}

func TestService_SemanticSearch_MaxLimit(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	input := &record.SemanticSearchInput{
		Query: "test query",
		Limit: 500, // Exceeds max limit of 100
	}

	expectedResults := []*record.SemanticSearchResult{}

	// Should be capped at 100
	mockRepo.On("SemanticSearch", ctx, userID, "test query", 100).Return(expectedResults, nil)

	result, err := svc.SemanticSearch(ctx, userID, input)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	mockRepo.AssertExpectations(t)
}

