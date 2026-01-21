package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/kensan/backend/services/sync/internal"
	"github.com/kensan/backend/services/sync/internal/repository"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockRepository is a mock implementation of repository.Repository
type MockRepository struct {
	mock.Mock
}

// Compile-time check that MockRepository implements repository.Repository
var _ repository.Repository = (*MockRepository)(nil)

func (m *MockRepository) GetUserClockifySettings(ctx context.Context, userID string) (*sync.UserClockifySettings, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*sync.UserClockifySettings), args.Error(1)
}

func (m *MockRepository) UpdateUserClockifySettings(ctx context.Context, settings *sync.UserClockifySettings) error {
	args := m.Called(ctx, settings)
	return args.Error(0)
}

func (m *MockRepository) GetSyncStatus(ctx context.Context, userID string) (*sync.SyncStatus, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*sync.SyncStatus), args.Error(1)
}

func (m *MockRepository) UpdateSyncStatus(ctx context.Context, status *sync.SyncStatus) error {
	args := m.Called(ctx, status)
	return args.Error(0)
}

func (m *MockRepository) UpsertProject(ctx context.Context, userID, projectID, name, color string, archived bool, clientID, clientName *string) (bool, error) {
	args := m.Called(ctx, userID, projectID, name, color, archived, clientID, clientName)
	return args.Bool(0), args.Error(1)
}

func (m *MockRepository) UpsertTask(ctx context.Context, userID, taskID, clockifyProjectID, name string, completed bool) (bool, error) {
	args := m.Called(ctx, userID, taskID, clockifyProjectID, name, completed)
	return args.Bool(0), args.Error(1)
}

func (m *MockRepository) UpsertTimeEntry(ctx context.Context, userID, entryID, description, projectID string, taskID *string, startTime, endTime time.Time, duration string) (bool, error) {
	args := m.Called(ctx, userID, entryID, description, projectID, taskID, startTime, endTime, duration)
	return args.Bool(0), args.Error(1)
}

func (m *MockRepository) GetProjectByClockifyID(ctx context.Context, userID, clockifyID string) (bool, error) {
	args := m.Called(ctx, userID, clockifyID)
	return args.Bool(0), args.Error(1)
}

func (m *MockRepository) GetTimeEntryByClockifyID(ctx context.Context, userID, clockifyID string) (bool, error) {
	args := m.Called(ctx, userID, clockifyID)
	return args.Bool(0), args.Error(1)
}

// ========== Service.GetSyncStatus Tests ==========

func TestService_GetSyncStatus_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo, nil)
	ctx := context.Background()
	userID := "user-123"

	now := time.Now()
	expectedStatus := &sync.SyncStatus{
		UserID:     userID,
		LastSyncAt: &now,
		Status:     sync.SyncStatusHealthy,
	}

	mockRepo.On("GetSyncStatus", ctx, userID).Return(expectedStatus, nil)

	result, err := svc.GetSyncStatus(ctx, userID)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, userID, result.UserID)
	assert.Equal(t, sync.SyncStatusHealthy, result.Status)
	mockRepo.AssertExpectations(t)
}

func TestService_GetSyncStatus_NotFound(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo, nil)
	ctx := context.Background()
	userID := "user-123"

	mockRepo.On("GetSyncStatus", ctx, userID).Return(nil, nil)

	result, err := svc.GetSyncStatus(ctx, userID)

	assert.NoError(t, err)
	assert.Nil(t, result)
	mockRepo.AssertExpectations(t)
}

func TestService_GetSyncStatus_RepositoryError(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo, nil)
	ctx := context.Background()
	userID := "user-123"

	expectedErr := errors.New("database connection failed")
	mockRepo.On("GetSyncStatus", ctx, userID).Return(nil, expectedErr)

	result, err := svc.GetSyncStatus(ctx, userID)

	assert.Error(t, err)
	assert.Equal(t, expectedErr, err)
	assert.Nil(t, result)
	mockRepo.AssertExpectations(t)
}

// ========== Service.GetWorkspaces Tests ==========

func TestService_GetWorkspaces_EmptyAPIKey(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo, nil)
	ctx := context.Background()

	result, err := svc.GetWorkspaces(ctx, "")

	assert.Error(t, err)
	assert.Equal(t, ErrAPIKeyRequired, err)
	assert.Nil(t, result)
}

// ========== Service.SyncProjects Validation Tests ==========

func TestService_SyncProjects_MissingAPIKey(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo, nil)
	ctx := context.Background()
	userID := "user-123"

	// Settings without API key
	settings := &sync.UserClockifySettings{
		UserID: userID,
	}

	mockRepo.On("GetUserClockifySettings", ctx, userID).Return(settings, nil)
	mockRepo.On("UpdateSyncStatus", ctx, mock.AnythingOfType("*sync.SyncStatus")).Return(nil)

	result, err := svc.SyncProjects(ctx, userID)

	assert.Error(t, err)
	assert.Equal(t, ErrAPIKeyRequired, err)
	assert.Nil(t, result)
	mockRepo.AssertExpectations(t)
}

func TestService_SyncProjects_EmptyAPIKey(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo, nil)
	ctx := context.Background()
	userID := "user-123"

	// Settings with empty API key
	emptyAPIKey := ""
	settings := &sync.UserClockifySettings{
		UserID:         userID,
		ClockifyAPIKey: &emptyAPIKey,
	}

	mockRepo.On("GetUserClockifySettings", ctx, userID).Return(settings, nil)
	mockRepo.On("UpdateSyncStatus", ctx, mock.AnythingOfType("*sync.SyncStatus")).Return(nil)

	result, err := svc.SyncProjects(ctx, userID)

	assert.Error(t, err)
	assert.Equal(t, ErrAPIKeyRequired, err)
	assert.Nil(t, result)
	mockRepo.AssertExpectations(t)
}

func TestService_SyncProjects_MissingWorkspaceID(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo, nil)
	ctx := context.Background()
	userID := "user-123"

	// Settings with API key but no workspace
	apiKey := "api-key-123"
	settings := &sync.UserClockifySettings{
		UserID:         userID,
		ClockifyAPIKey: &apiKey,
	}

	mockRepo.On("GetUserClockifySettings", ctx, userID).Return(settings, nil)
	mockRepo.On("UpdateSyncStatus", ctx, mock.AnythingOfType("*sync.SyncStatus")).Return(nil)

	result, err := svc.SyncProjects(ctx, userID)

	assert.Error(t, err)
	assert.Equal(t, ErrWorkspaceRequired, err)
	assert.Nil(t, result)
	mockRepo.AssertExpectations(t)
}

func TestService_SyncProjects_EmptyWorkspaceID(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo, nil)
	ctx := context.Background()
	userID := "user-123"

	// Settings with API key but empty workspace
	apiKey := "api-key-123"
	emptyWorkspace := ""
	settings := &sync.UserClockifySettings{
		UserID:         userID,
		ClockifyAPIKey: &apiKey,
		WorkspaceID:    &emptyWorkspace,
	}

	mockRepo.On("GetUserClockifySettings", ctx, userID).Return(settings, nil)
	mockRepo.On("UpdateSyncStatus", ctx, mock.AnythingOfType("*sync.SyncStatus")).Return(nil)

	result, err := svc.SyncProjects(ctx, userID)

	assert.Error(t, err)
	assert.Equal(t, ErrWorkspaceRequired, err)
	assert.Nil(t, result)
	mockRepo.AssertExpectations(t)
}

func TestService_SyncProjects_SettingsError(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo, nil)
	ctx := context.Background()
	userID := "user-123"

	expectedErr := errors.New("database error")
	mockRepo.On("GetUserClockifySettings", ctx, userID).Return(nil, expectedErr)
	mockRepo.On("UpdateSyncStatus", ctx, mock.AnythingOfType("*sync.SyncStatus")).Return(nil)

	result, err := svc.SyncProjects(ctx, userID)

	assert.Error(t, err)
	assert.Equal(t, expectedErr, err)
	assert.Nil(t, result)
	mockRepo.AssertExpectations(t)
}

// ========== Service.SyncTimeEntries Validation Tests ==========

func TestService_SyncTimeEntries_MissingAPIKey(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo, nil)
	ctx := context.Background()
	userID := "user-123"
	startDate := time.Now().AddDate(0, 0, -7)
	endDate := time.Now()

	// Settings without API key
	settings := &sync.UserClockifySettings{
		UserID: userID,
	}

	mockRepo.On("GetUserClockifySettings", ctx, userID).Return(settings, nil)
	mockRepo.On("UpdateSyncStatus", ctx, mock.AnythingOfType("*sync.SyncStatus")).Return(nil)

	result, err := svc.SyncTimeEntries(ctx, userID, startDate, endDate)

	assert.Error(t, err)
	assert.Equal(t, ErrAPIKeyRequired, err)
	assert.Nil(t, result)
	mockRepo.AssertExpectations(t)
}

func TestService_SyncTimeEntries_MissingWorkspaceID(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo, nil)
	ctx := context.Background()
	userID := "user-123"
	startDate := time.Now().AddDate(0, 0, -7)
	endDate := time.Now()

	// Settings with API key but no workspace
	apiKey := "api-key-123"
	settings := &sync.UserClockifySettings{
		UserID:         userID,
		ClockifyAPIKey: &apiKey,
	}

	mockRepo.On("GetUserClockifySettings", ctx, userID).Return(settings, nil)
	mockRepo.On("UpdateSyncStatus", ctx, mock.AnythingOfType("*sync.SyncStatus")).Return(nil)

	result, err := svc.SyncTimeEntries(ctx, userID, startDate, endDate)

	assert.Error(t, err)
	assert.Equal(t, ErrWorkspaceRequired, err)
	assert.Nil(t, result)
	mockRepo.AssertExpectations(t)
}

func TestService_SyncTimeEntries_MissingClockifyUserID(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo, nil)
	ctx := context.Background()
	userID := "user-123"
	startDate := time.Now().AddDate(0, 0, -7)
	endDate := time.Now()

	// Settings with API key and workspace but no Clockify user ID
	apiKey := "api-key-123"
	workspaceID := "workspace-456"
	settings := &sync.UserClockifySettings{
		UserID:         userID,
		ClockifyAPIKey: &apiKey,
		WorkspaceID:    &workspaceID,
	}

	mockRepo.On("GetUserClockifySettings", ctx, userID).Return(settings, nil)
	mockRepo.On("UpdateSyncStatus", ctx, mock.AnythingOfType("*sync.SyncStatus")).Return(nil)

	result, err := svc.SyncTimeEntries(ctx, userID, startDate, endDate)

	assert.Error(t, err)
	assert.Equal(t, ErrClockifyUserRequired, err)
	assert.Nil(t, result)
	mockRepo.AssertExpectations(t)
}

func TestService_SyncTimeEntries_EmptyClockifyUserID(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo, nil)
	ctx := context.Background()
	userID := "user-123"
	startDate := time.Now().AddDate(0, 0, -7)
	endDate := time.Now()

	// Settings with API key and workspace but empty Clockify user ID
	apiKey := "api-key-123"
	workspaceID := "workspace-456"
	emptyClockifyUserID := ""
	settings := &sync.UserClockifySettings{
		UserID:         userID,
		ClockifyAPIKey: &apiKey,
		WorkspaceID:    &workspaceID,
		ClockifyUserID: &emptyClockifyUserID,
	}

	mockRepo.On("GetUserClockifySettings", ctx, userID).Return(settings, nil)
	mockRepo.On("UpdateSyncStatus", ctx, mock.AnythingOfType("*sync.SyncStatus")).Return(nil)

	result, err := svc.SyncTimeEntries(ctx, userID, startDate, endDate)

	assert.Error(t, err)
	assert.Equal(t, ErrClockifyUserRequired, err)
	assert.Nil(t, result)
	mockRepo.AssertExpectations(t)
}

// ========== Service.TriggerSync Tests ==========

func TestService_TriggerSync_ValidationError(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo, nil)
	ctx := context.Background()
	userID := "user-123"

	// Settings without API key
	settings := &sync.UserClockifySettings{
		UserID: userID,
	}

	// First call: UpdateSyncStatus to set pending
	mockRepo.On("UpdateSyncStatus", ctx, mock.MatchedBy(func(s *sync.SyncStatus) bool {
		return s.Status == sync.SyncStatusPending && s.UserID == userID
	})).Return(nil).Once()

	// SyncProjects calls
	mockRepo.On("GetUserClockifySettings", ctx, userID).Return(settings, nil)
	mockRepo.On("UpdateSyncStatus", ctx, mock.MatchedBy(func(s *sync.SyncStatus) bool {
		return s.Status == sync.SyncStatusError
	})).Return(nil)

	result, err := svc.TriggerSync(ctx, userID)

	assert.Error(t, err)
	assert.Equal(t, ErrAPIKeyRequired, err)
	assert.Nil(t, result)
	mockRepo.AssertExpectations(t)
}

