package service

import (
	"context"
	"errors"
	"testing"

	timeblock "github.com/kensan/backend/services/timeblock/internal"
	"github.com/kensan/backend/services/timeblock/internal/repository"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockRepository is a mock implementation of the timeblock repository
type MockRepository struct {
	mock.Mock
}

// Compile-time check: MockRepository must implement repository.Repository
var _ repository.Repository = (*MockRepository)(nil)

// TimeBlock methods
func (m *MockRepository) ListTimeBlocks(ctx context.Context, userID string, filter timeblock.TimeBlockFilter) ([]timeblock.TimeBlock, error) {
	args := m.Called(ctx, userID, filter)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]timeblock.TimeBlock), args.Error(1)
}

func (m *MockRepository) GetTimeBlockByID(ctx context.Context, userID, timeBlockID string) (*timeblock.TimeBlock, error) {
	args := m.Called(ctx, userID, timeBlockID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*timeblock.TimeBlock), args.Error(1)
}

func (m *MockRepository) CreateTimeBlock(ctx context.Context, userID string, input timeblock.CreateTimeBlockInput) (*timeblock.TimeBlock, error) {
	args := m.Called(ctx, userID, input)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*timeblock.TimeBlock), args.Error(1)
}

func (m *MockRepository) UpdateTimeBlock(ctx context.Context, userID, timeBlockID string, input timeblock.UpdateTimeBlockInput) (*timeblock.TimeBlock, error) {
	args := m.Called(ctx, userID, timeBlockID, input)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*timeblock.TimeBlock), args.Error(1)
}

func (m *MockRepository) DeleteTimeBlock(ctx context.Context, userID, timeBlockID string) error {
	args := m.Called(ctx, userID, timeBlockID)
	return args.Error(0)
}

func (m *MockRepository) CreateTimeBlockBatch(ctx context.Context, userID string, inputs []timeblock.CreateTimeBlockInput) ([]timeblock.TimeBlock, error) {
	args := m.Called(ctx, userID, inputs)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]timeblock.TimeBlock), args.Error(1)
}

// TimeEntry methods
func (m *MockRepository) ListTimeEntries(ctx context.Context, userID string, filter timeblock.TimeEntryFilter) ([]timeblock.TimeEntry, error) {
	args := m.Called(ctx, userID, filter)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]timeblock.TimeEntry), args.Error(1)
}

func (m *MockRepository) GetTimeEntryByID(ctx context.Context, userID, timeEntryID string) (*timeblock.TimeEntry, error) {
	args := m.Called(ctx, userID, timeEntryID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*timeblock.TimeEntry), args.Error(1)
}

func (m *MockRepository) CreateTimeEntry(ctx context.Context, userID string, input timeblock.CreateTimeEntryInput) (*timeblock.TimeEntry, error) {
	args := m.Called(ctx, userID, input)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*timeblock.TimeEntry), args.Error(1)
}

func (m *MockRepository) UpdateTimeEntry(ctx context.Context, userID, timeEntryID string, input timeblock.UpdateTimeEntryInput) (*timeblock.TimeEntry, error) {
	args := m.Called(ctx, userID, timeEntryID, input)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*timeblock.TimeEntry), args.Error(1)
}

func (m *MockRepository) DeleteTimeEntry(ctx context.Context, userID, timeEntryID string) error {
	args := m.Called(ctx, userID, timeEntryID)
	return args.Error(0)
}

// Timer methods
func (m *MockRepository) GetRunningTimer(ctx context.Context, userID string) (*timeblock.RunningTimer, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*timeblock.RunningTimer), args.Error(1)
}

func (m *MockRepository) StartTimer(ctx context.Context, userID string, input timeblock.StartTimerInput) (*timeblock.RunningTimer, error) {
	args := m.Called(ctx, userID, input)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*timeblock.RunningTimer), args.Error(1)
}

func (m *MockRepository) StopTimer(ctx context.Context, userID string) (*timeblock.TimeEntry, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*timeblock.TimeEntry), args.Error(1)
}

// ========== Date/Time Validation Tests ==========

func TestValidateDate(t *testing.T) {
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
			result := validateDate(tc.date)
			assert.Equal(t, tc.expected, result)
		})
	}
}

func TestValidateTime(t *testing.T) {
	testCases := []struct {
		time     string
		expected bool
	}{
		{"00:00", true},
		{"09:30", true},
		{"23:59", true},
		{"12:00", true},
		{"9:30", false},
		{"09:3", false},
		{"24:00", true}, // Regex only checks format, not value
		{"invalid", false},
		{"", false},
	}

	for _, tc := range testCases {
		t.Run(tc.time, func(t *testing.T) {
			result := validateTime(tc.time)
			assert.Equal(t, tc.expected, result)
		})
	}
}

// ========== TimeBlock List Tests ==========

func TestService_ListTimeBlocks_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	filter := timeblock.TimeBlockFilter{}

	expectedBlocks := []timeblock.TimeBlock{
		{ID: "tb1", TaskName: "Morning Study", Date: "2024-01-15", StartTime: "09:00", EndTime: "10:00"},
		{ID: "tb2", TaskName: "Afternoon Work", Date: "2024-01-15", StartTime: "14:00", EndTime: "16:00"},
	}

	mockRepo.On("ListTimeBlocks", ctx, userID, filter).Return(expectedBlocks, nil)

	result, err := svc.ListTimeBlocks(ctx, userID, filter, "")

	assert.NoError(t, err)
	assert.Len(t, result, 2)
	assert.Equal(t, "Morning Study", result[0].TaskName)
	mockRepo.AssertExpectations(t)
}

func TestService_ListTimeBlocks_ByDate(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	date := "2024-01-15"
	filter := timeblock.TimeBlockFilter{
		Date: &date,
	}

	expectedBlocks := []timeblock.TimeBlock{
		{ID: "tb1", TaskName: "Study", Date: date},
	}

	mockRepo.On("ListTimeBlocks", ctx, userID, filter).Return(expectedBlocks, nil)

	result, err := svc.ListTimeBlocks(ctx, userID, filter, "")

	assert.NoError(t, err)
	assert.Len(t, result, 1)
	assert.Equal(t, date, result[0].Date)
	mockRepo.AssertExpectations(t)
}

func TestService_ListTimeBlocks_InvalidDateFilter(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	invalidDate := "01-15-2024"
	filter := timeblock.TimeBlockFilter{
		Date: &invalidDate,
	}

	result, err := svc.ListTimeBlocks(ctx, userID, filter, "")

	assert.ErrorIs(t, err, ErrInvalidDate)
	assert.Nil(t, result)
	mockRepo.AssertNotCalled(t, "ListTimeBlocks")
}

func TestService_ListTimeBlocks_ReturnsEmptySliceForNil(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	filter := timeblock.TimeBlockFilter{}

	mockRepo.On("ListTimeBlocks", ctx, userID, filter).Return(nil, nil)

	result, err := svc.ListTimeBlocks(ctx, userID, filter, "")

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result, 0)
	mockRepo.AssertExpectations(t)
}

// ========== TimeBlock GetByID Tests ==========

func TestService_GetTimeBlock_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	timeBlockID := "tb-123"

	expectedBlock := &timeblock.TimeBlock{
		ID:        timeBlockID,
		UserID:    userID,
		TaskName:  "Test Block",
		Date:      "2024-01-15",
		StartTime: "09:00",
		EndTime:   "10:00",
	}

	mockRepo.On("GetTimeBlockByID", ctx, userID, timeBlockID).Return(expectedBlock, nil)

	result, err := svc.GetTimeBlock(ctx, userID, timeBlockID)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "Test Block", result.TaskName)
	mockRepo.AssertExpectations(t)
}

func TestService_GetTimeBlock_NotFound(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	timeBlockID := "nonexistent"

	mockRepo.On("GetTimeBlockByID", ctx, userID, timeBlockID).Return(nil, nil)

	result, err := svc.GetTimeBlock(ctx, userID, timeBlockID)

	assert.ErrorIs(t, err, ErrTimeBlockNotFound)
	assert.Nil(t, result)
	mockRepo.AssertExpectations(t)
}

func TestService_GetTimeBlock_RepoError(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	timeBlockID := "tb-123"
	repoErr := errors.New("database error")

	mockRepo.On("GetTimeBlockByID", ctx, userID, timeBlockID).Return(nil, repoErr)

	result, err := svc.GetTimeBlock(ctx, userID, timeBlockID)

	assert.ErrorIs(t, err, repoErr)
	assert.Nil(t, result)
	mockRepo.AssertExpectations(t)
}

// ========== TimeBlock Create Tests ==========

func TestService_CreateTimeBlock_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	input := timeblock.CreateTimeBlockInput{
		Date:      "2024-01-15",
		StartTime: "09:00",
		EndTime:   "10:00",
		TaskName:  "New Block",
	}

	expectedBlock := &timeblock.TimeBlock{
		ID:        "tb-new",
		UserID:    userID,
		TaskName:  "New Block",
		Date:      "2024-01-15",
		StartTime: "09:00",
		EndTime:   "10:00",
	}

	mockRepo.On("CreateTimeBlock", ctx, userID, input).Return(expectedBlock, nil)

	result, err := svc.CreateTimeBlock(ctx, userID, input)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "New Block", result.TaskName)
	mockRepo.AssertExpectations(t)
}

func TestService_CreateTimeBlock_EmptyTaskName(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	input := timeblock.CreateTimeBlockInput{
		Date:      "2024-01-15",
		StartTime: "09:00",
		EndTime:   "10:00",
		TaskName:  "",
	}

	result, err := svc.CreateTimeBlock(ctx, userID, input)

	assert.ErrorIs(t, err, ErrInvalidInput)
	assert.Nil(t, result)
	mockRepo.AssertNotCalled(t, "CreateTimeBlock")
}

func TestService_CreateTimeBlock_InvalidDate(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	input := timeblock.CreateTimeBlockInput{
		Date:      "01-15-2024",
		StartTime: "09:00",
		EndTime:   "10:00",
		TaskName:  "Task",
	}

	result, err := svc.CreateTimeBlock(ctx, userID, input)

	assert.ErrorIs(t, err, ErrInvalidDate)
	assert.Nil(t, result)
	mockRepo.AssertNotCalled(t, "CreateTimeBlock")
}

func TestService_CreateTimeBlock_InvalidStartTime(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	input := timeblock.CreateTimeBlockInput{
		Date:      "2024-01-15",
		StartTime: "9:00",
		EndTime:   "10:00",
		TaskName:  "Task",
	}

	result, err := svc.CreateTimeBlock(ctx, userID, input)

	assert.ErrorIs(t, err, ErrInvalidTime)
	assert.Nil(t, result)
	mockRepo.AssertNotCalled(t, "CreateTimeBlock")
}

func TestService_CreateTimeBlock_InvalidEndTime(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	input := timeblock.CreateTimeBlockInput{
		Date:      "2024-01-15",
		StartTime: "09:00",
		EndTime:   "10",
		TaskName:  "Task",
	}

	result, err := svc.CreateTimeBlock(ctx, userID, input)

	assert.ErrorIs(t, err, ErrInvalidTime)
	assert.Nil(t, result)
	mockRepo.AssertNotCalled(t, "CreateTimeBlock")
}

// ========== TimeBlock Update Tests ==========

func TestService_UpdateTimeBlock_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	timeBlockID := "tb-123"
	newTaskName := "Updated Block"

	existingBlock := &timeblock.TimeBlock{
		ID:        timeBlockID,
		UserID:    userID,
		TaskName:  "Old Block",
		Date:      "2024-01-15",
		StartTime: "09:00",
		EndTime:   "10:00",
	}

	input := timeblock.UpdateTimeBlockInput{
		TaskName: &newTaskName,
	}

	updatedBlock := &timeblock.TimeBlock{
		ID:        timeBlockID,
		UserID:    userID,
		TaskName:  newTaskName,
		Date:      "2024-01-15",
		StartTime: "09:00",
		EndTime:   "10:00",
	}

	mockRepo.On("GetTimeBlockByID", ctx, userID, timeBlockID).Return(existingBlock, nil)
	mockRepo.On("UpdateTimeBlock", ctx, userID, timeBlockID, input).Return(updatedBlock, nil)

	result, err := svc.UpdateTimeBlock(ctx, userID, timeBlockID, input)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, newTaskName, result.TaskName)
	mockRepo.AssertExpectations(t)
}

func TestService_UpdateTimeBlock_NotFound(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	timeBlockID := "nonexistent"
	newTaskName := "Updated Block"

	input := timeblock.UpdateTimeBlockInput{
		TaskName: &newTaskName,
	}

	mockRepo.On("GetTimeBlockByID", ctx, userID, timeBlockID).Return(nil, nil)

	result, err := svc.UpdateTimeBlock(ctx, userID, timeBlockID, input)

	assert.ErrorIs(t, err, ErrTimeBlockNotFound)
	assert.Nil(t, result)
	mockRepo.AssertNotCalled(t, "UpdateTimeBlock")
}

func TestService_UpdateTimeBlock_InvalidDate(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	timeBlockID := "tb-123"
	invalidDate := "01-15-2024"

	existingBlock := &timeblock.TimeBlock{
		ID:        timeBlockID,
		UserID:    userID,
		TaskName:  "Block",
		Date:      "2024-01-15",
		StartTime: "09:00",
		EndTime:   "10:00",
	}

	input := timeblock.UpdateTimeBlockInput{
		Date: &invalidDate,
	}

	mockRepo.On("GetTimeBlockByID", ctx, userID, timeBlockID).Return(existingBlock, nil)

	result, err := svc.UpdateTimeBlock(ctx, userID, timeBlockID, input)

	assert.ErrorIs(t, err, ErrInvalidDate)
	assert.Nil(t, result)
	mockRepo.AssertNotCalled(t, "UpdateTimeBlock")
}

// ========== TimeBlock Delete Tests ==========

func TestService_DeleteTimeBlock_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	timeBlockID := "tb-123"

	existingBlock := &timeblock.TimeBlock{
		ID:        timeBlockID,
		UserID:    userID,
		TaskName:  "Block to delete",
		Date:      "2024-01-15",
		StartTime: "09:00",
		EndTime:   "10:00",
	}

	mockRepo.On("GetTimeBlockByID", ctx, userID, timeBlockID).Return(existingBlock, nil)
	mockRepo.On("DeleteTimeBlock", ctx, userID, timeBlockID).Return(nil)

	err := svc.DeleteTimeBlock(ctx, userID, timeBlockID)

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestService_DeleteTimeBlock_NotFound(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	timeBlockID := "nonexistent"

	mockRepo.On("GetTimeBlockByID", ctx, userID, timeBlockID).Return(nil, nil)

	err := svc.DeleteTimeBlock(ctx, userID, timeBlockID)

	assert.ErrorIs(t, err, ErrTimeBlockNotFound)
	mockRepo.AssertNotCalled(t, "DeleteTimeBlock")
}

// ========== TimeEntry List Tests ==========

func TestService_ListTimeEntries_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	filter := timeblock.TimeEntryFilter{}

	expectedEntries := []timeblock.TimeEntry{
		{ID: "te1", TaskName: "Work Task", Date: "2024-01-15", StartTime: "09:00", EndTime: "10:30"},
		{ID: "te2", TaskName: "Another Task", Date: "2024-01-15", StartTime: "11:00", EndTime: "12:00"},
	}

	mockRepo.On("ListTimeEntries", ctx, userID, filter).Return(expectedEntries, nil)

	result, err := svc.ListTimeEntries(ctx, userID, filter, "")

	assert.NoError(t, err)
	assert.Len(t, result, 2)
	mockRepo.AssertExpectations(t)
}

func TestService_ListTimeEntries_InvalidDateFilter(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	invalidDate := "invalid"
	filter := timeblock.TimeEntryFilter{
		Date: &invalidDate,
	}

	result, err := svc.ListTimeEntries(ctx, userID, filter, "")

	assert.ErrorIs(t, err, ErrInvalidDate)
	assert.Nil(t, result)
	mockRepo.AssertNotCalled(t, "ListTimeEntries")
}

func TestService_ListTimeEntries_ReturnsEmptySliceForNil(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	filter := timeblock.TimeEntryFilter{}

	mockRepo.On("ListTimeEntries", ctx, userID, filter).Return(nil, nil)

	result, err := svc.ListTimeEntries(ctx, userID, filter, "")

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result, 0)
	mockRepo.AssertExpectations(t)
}

// ========== TimeEntry GetByID Tests ==========

func TestService_GetTimeEntry_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	timeEntryID := "te-123"

	expectedEntry := &timeblock.TimeEntry{
		ID:        timeEntryID,
		UserID:    userID,
		TaskName:  "Test Entry",
		Date:      "2024-01-15",
		StartTime: "09:00",
		EndTime:   "10:00",
	}

	mockRepo.On("GetTimeEntryByID", ctx, userID, timeEntryID).Return(expectedEntry, nil)

	result, err := svc.GetTimeEntry(ctx, userID, timeEntryID)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "Test Entry", result.TaskName)
	mockRepo.AssertExpectations(t)
}

func TestService_GetTimeEntry_NotFound(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	timeEntryID := "nonexistent"

	mockRepo.On("GetTimeEntryByID", ctx, userID, timeEntryID).Return(nil, nil)

	result, err := svc.GetTimeEntry(ctx, userID, timeEntryID)

	assert.ErrorIs(t, err, ErrTimeEntryNotFound)
	assert.Nil(t, result)
	mockRepo.AssertExpectations(t)
}

// ========== TimeEntry Create Tests ==========

func TestService_CreateTimeEntry_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	input := timeblock.CreateTimeEntryInput{
		Date:        "2024-01-15",
		StartTime:   "09:00",
		EndTime:     "10:30",
		TaskName:    "New Entry",
		Description: strPtr("Working on feature"),
	}

	expectedEntry := &timeblock.TimeEntry{
		ID:          "te-new",
		UserID:      userID,
		TaskName:    "New Entry",
		Date:        "2024-01-15",
		StartTime:   "09:00",
		EndTime:     "10:30",
		Description: strPtr("Working on feature"),
	}

	mockRepo.On("CreateTimeEntry", ctx, userID, input).Return(expectedEntry, nil)

	result, err := svc.CreateTimeEntry(ctx, userID, input)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "New Entry", result.TaskName)
	mockRepo.AssertExpectations(t)
}

func TestService_CreateTimeEntry_EmptyTaskName(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	input := timeblock.CreateTimeEntryInput{
		Date:      "2024-01-15",
		StartTime: "09:00",
		EndTime:   "10:30",
		TaskName:  "",
	}

	result, err := svc.CreateTimeEntry(ctx, userID, input)

	assert.ErrorIs(t, err, ErrInvalidInput)
	assert.Nil(t, result)
	mockRepo.AssertNotCalled(t, "CreateTimeEntry")
}

func TestService_CreateTimeEntry_InvalidDate(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	input := timeblock.CreateTimeEntryInput{
		Date:      "2024/01/15",
		StartTime: "09:00",
		EndTime:   "10:30",
		TaskName:  "Task",
	}

	result, err := svc.CreateTimeEntry(ctx, userID, input)

	assert.ErrorIs(t, err, ErrInvalidDate)
	assert.Nil(t, result)
	mockRepo.AssertNotCalled(t, "CreateTimeEntry")
}

func TestService_CreateTimeEntry_InvalidTime(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	input := timeblock.CreateTimeEntryInput{
		Date:      "2024-01-15",
		StartTime: "9:00",
		EndTime:   "10:30",
		TaskName:  "Task",
	}

	result, err := svc.CreateTimeEntry(ctx, userID, input)

	assert.ErrorIs(t, err, ErrInvalidTime)
	assert.Nil(t, result)
	mockRepo.AssertNotCalled(t, "CreateTimeEntry")
}

// ========== TimeEntry Update Tests ==========

func TestService_UpdateTimeEntry_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	timeEntryID := "te-123"
	newTaskName := "Updated Entry"

	existingEntry := &timeblock.TimeEntry{
		ID:        timeEntryID,
		UserID:    userID,
		TaskName:  "Old Entry",
		Date:      "2024-01-15",
		StartTime: "09:00",
		EndTime:   "10:00",
	}

	input := timeblock.UpdateTimeEntryInput{
		TaskName: &newTaskName,
	}

	updatedEntry := &timeblock.TimeEntry{
		ID:        timeEntryID,
		UserID:    userID,
		TaskName:  newTaskName,
		Date:      "2024-01-15",
		StartTime: "09:00",
		EndTime:   "10:00",
	}

	mockRepo.On("GetTimeEntryByID", ctx, userID, timeEntryID).Return(existingEntry, nil)
	mockRepo.On("UpdateTimeEntry", ctx, userID, timeEntryID, input).Return(updatedEntry, nil)

	result, err := svc.UpdateTimeEntry(ctx, userID, timeEntryID, input)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, newTaskName, result.TaskName)
	mockRepo.AssertExpectations(t)
}

func TestService_UpdateTimeEntry_NotFound(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	timeEntryID := "nonexistent"
	newTaskName := "Updated Entry"

	input := timeblock.UpdateTimeEntryInput{
		TaskName: &newTaskName,
	}

	mockRepo.On("GetTimeEntryByID", ctx, userID, timeEntryID).Return(nil, nil)

	result, err := svc.UpdateTimeEntry(ctx, userID, timeEntryID, input)

	assert.ErrorIs(t, err, ErrTimeEntryNotFound)
	assert.Nil(t, result)
	mockRepo.AssertNotCalled(t, "UpdateTimeEntry")
}

func TestService_UpdateTimeEntry_InvalidTime(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	timeEntryID := "te-123"
	invalidTime := "9:00"

	existingEntry := &timeblock.TimeEntry{
		ID:        timeEntryID,
		UserID:    userID,
		TaskName:  "Entry",
		Date:      "2024-01-15",
		StartTime: "09:00",
		EndTime:   "10:00",
	}

	input := timeblock.UpdateTimeEntryInput{
		StartTime: &invalidTime,
	}

	mockRepo.On("GetTimeEntryByID", ctx, userID, timeEntryID).Return(existingEntry, nil)

	result, err := svc.UpdateTimeEntry(ctx, userID, timeEntryID, input)

	assert.ErrorIs(t, err, ErrInvalidTime)
	assert.Nil(t, result)
	mockRepo.AssertNotCalled(t, "UpdateTimeEntry")
}

// ========== TimeEntry Delete Tests ==========

func TestService_DeleteTimeEntry_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	timeEntryID := "te-123"

	existingEntry := &timeblock.TimeEntry{
		ID:        timeEntryID,
		UserID:    userID,
		TaskName:  "Entry to delete",
		Date:      "2024-01-15",
		StartTime: "09:00",
		EndTime:   "10:00",
	}

	mockRepo.On("GetTimeEntryByID", ctx, userID, timeEntryID).Return(existingEntry, nil)
	mockRepo.On("DeleteTimeEntry", ctx, userID, timeEntryID).Return(nil)

	err := svc.DeleteTimeEntry(ctx, userID, timeEntryID)

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestService_DeleteTimeEntry_NotFound(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	timeEntryID := "nonexistent"

	mockRepo.On("GetTimeEntryByID", ctx, userID, timeEntryID).Return(nil, nil)

	err := svc.DeleteTimeEntry(ctx, userID, timeEntryID)

	assert.ErrorIs(t, err, ErrTimeEntryNotFound)
	mockRepo.AssertNotCalled(t, "DeleteTimeEntry")
}

// ========== GenerateFromRoutines Tests ==========

func TestService_GenerateFromRoutines_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	input := timeblock.GenerateFromRoutinesInput{
		Date: "2024-01-15",
	}

	result, err := svc.GenerateFromRoutines(ctx, userID, input)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 0, result.Generated)
	assert.NotNil(t, result.Blocks)
	assert.Len(t, result.Blocks, 0)
}

func TestService_GenerateFromRoutines_InvalidDate(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	input := timeblock.GenerateFromRoutinesInput{
		Date: "invalid-date",
	}

	result, err := svc.GenerateFromRoutines(ctx, userID, input)

	assert.ErrorIs(t, err, ErrInvalidDate)
	assert.Nil(t, result)
}

func TestService_GenerateFromRoutines_EmptyDate(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)
	ctx := context.Background()
	userID := "user-123"

	input := timeblock.GenerateFromRoutinesInput{
		Date: "",
	}

	result, err := svc.GenerateFromRoutines(ctx, userID, input)

	assert.ErrorIs(t, err, ErrInvalidDate)
	assert.Nil(t, result)
}

// Helper function
func strPtr(s string) *string {
	return &s
}
