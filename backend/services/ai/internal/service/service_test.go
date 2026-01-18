package service

import (
	"context"
	"errors"
	"testing"

	"github.com/kensan/backend/services/ai/internal"
	"github.com/kensan/backend/services/ai/internal/repository"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// Compile-time check that MockRepository implements repository.Repository
var _ repository.Repository = (*MockRepository)(nil)

// MockRepository is a mock implementation of the repository.Repository interface
type MockRepository struct {
	mock.Mock
}

func (m *MockRepository) GetTimeEntriesForPeriod(ctx context.Context, userID, startDate, endDate string) ([]ai.TimeEntryData, error) {
	args := m.Called(ctx, userID, startDate, endDate)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]ai.TimeEntryData), args.Error(1)
}

func (m *MockRepository) GetLearningRecordsForPeriod(ctx context.Context, userID, startDate, endDate string) ([]ai.LearningRecordData, error) {
	args := m.Called(ctx, userID, startDate, endDate)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]ai.LearningRecordData), args.Error(1)
}

func (m *MockRepository) CreateReport(ctx context.Context, report *ai.AIReviewReport) error {
	args := m.Called(ctx, report)
	if report != nil && report.ID == "" {
		report.ID = "report-new"
	}
	return args.Error(0)
}

func (m *MockRepository) GetReportByID(ctx context.Context, userID, reportID string) (*ai.AIReviewReport, error) {
	args := m.Called(ctx, userID, reportID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*ai.AIReviewReport), args.Error(1)
}

func (m *MockRepository) ListReports(ctx context.Context, userID string, filter ai.ReviewFilter) ([]ai.AIReviewReport, error) {
	args := m.Called(ctx, userID, filter)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]ai.AIReviewReport), args.Error(1)
}

func (m *MockRepository) DeleteReport(ctx context.Context, userID, reportID string) error {
	args := m.Called(ctx, userID, reportID)
	return args.Error(0)
}

// ========== Service.GetReview Tests ==========

func TestService_GetReview_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo, nil) // Claude client not needed for GetReview
	ctx := context.Background()
	userID := "user-123"
	reportID := "report-123"

	expectedReport := &ai.AIReviewReport{
		ID:        reportID,
		UserID:    userID,
		WeekStart: "2024-01-15",
		WeekEnd:   "2024-01-21",
		Summary:   "Great week",
	}

	mockRepo.On("GetReportByID", ctx, userID, reportID).Return(expectedReport, nil)

	result, err := svc.GetReview(ctx, userID, reportID)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "Great week", result.Summary)
	assert.Equal(t, reportID, result.ID)
	mockRepo.AssertExpectations(t)
}

func TestService_GetReview_NotFound(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo, nil)
	ctx := context.Background()
	userID := "user-123"
	reportID := "nonexistent"

	mockRepo.On("GetReportByID", ctx, userID, reportID).Return(nil, nil)

	result, err := svc.GetReview(ctx, userID, reportID)

	assert.Error(t, err)
	assert.Equal(t, ErrReportNotFound, err)
	assert.Nil(t, result)
	mockRepo.AssertExpectations(t)
}

func TestService_GetReview_RepositoryError(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo, nil)
	ctx := context.Background()
	userID := "user-123"
	reportID := "report-123"

	dbErr := errors.New("database connection failed")
	mockRepo.On("GetReportByID", ctx, userID, reportID).Return(nil, dbErr)

	result, err := svc.GetReview(ctx, userID, reportID)

	assert.Error(t, err)
	assert.Equal(t, dbErr, err)
	assert.Nil(t, result)
	mockRepo.AssertExpectations(t)
}

// ========== Service.ListReviews Tests ==========

func TestService_ListReviews_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo, nil)
	ctx := context.Background()
	userID := "user-123"
	filter := ai.ReviewFilter{}

	expectedReports := []ai.AIReviewReport{
		{ID: "r1", Summary: "Week 1 summary"},
		{ID: "r2", Summary: "Week 2 summary"},
	}

	mockRepo.On("ListReports", ctx, userID, filter).Return(expectedReports, nil)

	result, err := svc.ListReviews(ctx, userID, filter)

	assert.NoError(t, err)
	assert.Len(t, result, 2)
	assert.Equal(t, "r1", result[0].ID)
	assert.Equal(t, "r2", result[1].ID)
	mockRepo.AssertExpectations(t)
}

func TestService_ListReviews_Empty(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo, nil)
	ctx := context.Background()
	userID := "user-123"
	filter := ai.ReviewFilter{}

	mockRepo.On("ListReports", ctx, userID, filter).Return([]ai.AIReviewReport{}, nil)

	result, err := svc.ListReviews(ctx, userID, filter)

	assert.NoError(t, err)
	assert.Empty(t, result)
	mockRepo.AssertExpectations(t)
}

func TestService_ListReviews_NilReturnsEmptySlice(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo, nil)
	ctx := context.Background()
	userID := "user-123"
	filter := ai.ReviewFilter{}

	mockRepo.On("ListReports", ctx, userID, filter).Return(nil, nil)

	result, err := svc.ListReviews(ctx, userID, filter)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Empty(t, result)
	mockRepo.AssertExpectations(t)
}

func TestService_ListReviews_WithFilter(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo, nil)
	ctx := context.Background()
	userID := "user-123"
	startDate := "2024-01-01"
	endDate := "2024-03-31"
	filter := ai.ReviewFilter{
		StartDate: &startDate,
		EndDate:   &endDate,
	}

	expectedReports := []ai.AIReviewReport{
		{ID: "r1", WeekStart: "2024-01-15"},
	}

	mockRepo.On("ListReports", ctx, userID, filter).Return(expectedReports, nil)

	result, err := svc.ListReviews(ctx, userID, filter)

	assert.NoError(t, err)
	assert.Len(t, result, 1)
	mockRepo.AssertExpectations(t)
}

func TestService_ListReviews_RepositoryError(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo, nil)
	ctx := context.Background()
	userID := "user-123"
	filter := ai.ReviewFilter{}

	dbErr := errors.New("database error")
	mockRepo.On("ListReports", ctx, userID, filter).Return(nil, dbErr)

	result, err := svc.ListReviews(ctx, userID, filter)

	assert.Error(t, err)
	assert.Equal(t, dbErr, err)
	assert.Nil(t, result)
	mockRepo.AssertExpectations(t)
}

// ========== Service.GenerateReview Validation Tests ==========

func TestService_GenerateReview_EmptyWeekStart(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo, nil)
	ctx := context.Background()
	userID := "user-123"

	input := ai.GenerateReviewInput{
		WeekStart: "",
		WeekEnd:   "2024-01-21",
	}

	result, err := svc.GenerateReview(ctx, userID, input)

	assert.Error(t, err)
	assert.Equal(t, ErrInvalidInput, err)
	assert.Nil(t, result)
}

func TestService_GenerateReview_EmptyWeekEnd(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo, nil)
	ctx := context.Background()
	userID := "user-123"

	input := ai.GenerateReviewInput{
		WeekStart: "2024-01-15",
		WeekEnd:   "",
	}

	result, err := svc.GenerateReview(ctx, userID, input)

	assert.Error(t, err)
	assert.Equal(t, ErrInvalidInput, err)
	assert.Nil(t, result)
}

func TestService_GenerateReview_BothEmpty(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo, nil)
	ctx := context.Background()
	userID := "user-123"

	input := ai.GenerateReviewInput{
		WeekStart: "",
		WeekEnd:   "",
	}

	result, err := svc.GenerateReview(ctx, userID, input)

	assert.Error(t, err)
	assert.Equal(t, ErrInvalidInput, err)
	assert.Nil(t, result)
}

func TestService_GenerateReview_NoDataForPeriod(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo, nil)
	ctx := context.Background()
	userID := "user-123"

	input := ai.GenerateReviewInput{
		WeekStart: "2024-01-15",
		WeekEnd:   "2024-01-21",
	}

	// Both return empty slices
	mockRepo.On("GetTimeEntriesForPeriod", ctx, userID, input.WeekStart, input.WeekEnd).
		Return([]ai.TimeEntryData{}, nil)
	mockRepo.On("GetLearningRecordsForPeriod", ctx, userID, input.WeekStart, input.WeekEnd).
		Return([]ai.LearningRecordData{}, nil)

	result, err := svc.GenerateReview(ctx, userID, input)

	assert.Error(t, err)
	assert.Equal(t, ErrNoDataForPeriod, err)
	assert.Nil(t, result)
	mockRepo.AssertExpectations(t)
}

func TestService_GenerateReview_TimeEntriesError(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo, nil)
	ctx := context.Background()
	userID := "user-123"

	input := ai.GenerateReviewInput{
		WeekStart: "2024-01-15",
		WeekEnd:   "2024-01-21",
	}

	dbErr := errors.New("database error")
	mockRepo.On("GetTimeEntriesForPeriod", ctx, userID, input.WeekStart, input.WeekEnd).
		Return(nil, dbErr)

	result, err := svc.GenerateReview(ctx, userID, input)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to get time entries")
	assert.Nil(t, result)
	mockRepo.AssertExpectations(t)
}

func TestService_GenerateReview_LearningRecordsError(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo, nil)
	ctx := context.Background()
	userID := "user-123"

	input := ai.GenerateReviewInput{
		WeekStart: "2024-01-15",
		WeekEnd:   "2024-01-21",
	}

	mockRepo.On("GetTimeEntriesForPeriod", ctx, userID, input.WeekStart, input.WeekEnd).
		Return([]ai.TimeEntryData{{Description: "Task 1"}}, nil)

	dbErr := errors.New("database error")
	mockRepo.On("GetLearningRecordsForPeriod", ctx, userID, input.WeekStart, input.WeekEnd).
		Return(nil, dbErr)

	result, err := svc.GenerateReview(ctx, userID, input)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to get learning records")
	assert.Nil(t, result)
	mockRepo.AssertExpectations(t)
}

// ========== Service.Ask Validation Tests ==========

func TestService_Ask_EmptyQuestion(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo, nil)
	ctx := context.Background()
	userID := "user-123"

	input := ai.AskInput{
		Question: "",
		Context:  "Some context",
	}

	result, err := svc.Ask(ctx, userID, input)

	assert.Error(t, err)
	assert.Equal(t, ErrInvalidInput, err)
	assert.Nil(t, result)
}
