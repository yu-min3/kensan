package service

import (
	"context"
	"errors"
	"time"

	"github.com/kensan/backend/services/sync/internal"
	"github.com/kensan/backend/services/sync/internal/repository"
	"github.com/kensan/backend/services/sync/internal/clockify"
	"github.com/rs/zerolog/log"
)

var (
	ErrAPIKeyRequired     = errors.New("clockify API key is required")
	ErrWorkspaceRequired  = errors.New("workspace ID is required")
	ErrClockifyUserRequired = errors.New("clockify user ID is required")
)

// Service handles sync business logic
type Service struct {
	repo     repository.Repository
	clockify *clockify.Client
}

// NewService creates a new sync service
func NewService(repo repository.Repository, clockifyClient *clockify.Client) *Service {
	return &Service{
		repo:     repo,
		clockify: clockifyClient,
	}
}

// GetWorkspaces retrieves Clockify workspaces using the provided API key
func (s *Service) GetWorkspaces(ctx context.Context, apiKey string) ([]clockify.Workspace, error) {
	if apiKey == "" {
		return nil, ErrAPIKeyRequired
	}

	workspaces, err := s.clockify.GetWorkspaces(ctx, apiKey)
	if err != nil {
		log.Error().Err(err).Msg("failed to get workspaces from Clockify")
		return nil, err
	}

	return workspaces, nil
}

// SyncProjects synchronizes projects from Clockify to the local database
func (s *Service) SyncProjects(ctx context.Context, userID string) (*sync.SyncResult, error) {
	// Get user settings
	settings, err := s.repo.GetUserClockifySettings(ctx, userID)
	if err != nil {
		s.updateSyncStatusError(ctx, userID, err.Error())
		return nil, err
	}

	if settings.ClockifyAPIKey == nil || *settings.ClockifyAPIKey == "" {
		err := ErrAPIKeyRequired
		s.updateSyncStatusError(ctx, userID, err.Error())
		return nil, err
	}

	if settings.WorkspaceID == nil || *settings.WorkspaceID == "" {
		err := ErrWorkspaceRequired
		s.updateSyncStatusError(ctx, userID, err.Error())
		return nil, err
	}

	// Get projects from Clockify
	projects, err := s.clockify.GetProjects(ctx, *settings.ClockifyAPIKey, *settings.WorkspaceID)
	if err != nil {
		s.updateSyncStatusError(ctx, userID, err.Error())
		return nil, err
	}

	result := &sync.SyncResult{
		Synced: len(projects),
	}

	// Upsert projects
	for _, p := range projects {
		var clientID, clientName *string
		if p.ClientID != "" {
			clientID = &p.ClientID
		}
		if p.ClientName != "" {
			clientName = &p.ClientName
		}

		created, err := s.repo.UpsertProject(ctx, userID, p.ID, p.Name, p.Color, p.Archived, clientID, clientName)
		if err != nil {
			log.Error().Err(err).Str("projectID", p.ID).Msg("failed to upsert project")
			continue
		}

		if created {
			result.Created++
		} else {
			result.Updated++
		}
	}

	// Update sync status
	s.updateSyncStatusSuccess(ctx, userID)

	return result, nil
}

// SyncTimeEntries synchronizes time entries from Clockify to the local database
func (s *Service) SyncTimeEntries(ctx context.Context, userID string, startDate, endDate time.Time) (*sync.SyncResult, error) {
	// Get user settings
	settings, err := s.repo.GetUserClockifySettings(ctx, userID)
	if err != nil {
		s.updateSyncStatusError(ctx, userID, err.Error())
		return nil, err
	}

	if settings.ClockifyAPIKey == nil || *settings.ClockifyAPIKey == "" {
		err := ErrAPIKeyRequired
		s.updateSyncStatusError(ctx, userID, err.Error())
		return nil, err
	}

	if settings.WorkspaceID == nil || *settings.WorkspaceID == "" {
		err := ErrWorkspaceRequired
		s.updateSyncStatusError(ctx, userID, err.Error())
		return nil, err
	}

	if settings.ClockifyUserID == nil || *settings.ClockifyUserID == "" {
		err := ErrClockifyUserRequired
		s.updateSyncStatusError(ctx, userID, err.Error())
		return nil, err
	}

	// Get time entries from Clockify
	entries, err := s.clockify.GetTimeEntries(ctx, *settings.ClockifyAPIKey, *settings.WorkspaceID, *settings.ClockifyUserID, startDate, endDate)
	if err != nil {
		s.updateSyncStatusError(ctx, userID, err.Error())
		return nil, err
	}

	result := &sync.SyncResult{
		Synced: len(entries),
	}

	// Upsert time entries
	for _, e := range entries {
		var taskID *string
		if e.TaskID != "" {
			taskID = &e.TaskID
		}

		created, err := s.repo.UpsertTimeEntry(
			ctx,
			userID,
			e.ID,
			e.Description,
			e.ProjectID,
			taskID,
			e.TimeInterval.Start,
			e.TimeInterval.End,
			e.TimeInterval.Duration,
		)
		if err != nil {
			log.Error().Err(err).Str("entryID", e.ID).Msg("failed to upsert time entry")
			continue
		}

		if created {
			result.Created++
		} else {
			result.Updated++
		}
	}

	// Update sync status
	s.updateSyncStatusSuccess(ctx, userID)

	return result, nil
}

// GetSyncStatus retrieves the sync status for a user
func (s *Service) GetSyncStatus(ctx context.Context, userID string) (*sync.SyncStatus, error) {
	return s.repo.GetSyncStatus(ctx, userID)
}

// TriggerSync triggers a full sync for a user (projects and recent time entries)
func (s *Service) TriggerSync(ctx context.Context, userID string) (*sync.SyncResult, error) {
	// Set status to pending
	status := &sync.SyncStatus{
		UserID: userID,
		Status: sync.SyncStatusPending,
	}
	if err := s.repo.UpdateSyncStatus(ctx, status); err != nil {
		log.Error().Err(err).Msg("failed to update sync status to pending")
	}

	totalResult := &sync.SyncResult{}

	// Sync projects
	projectResult, err := s.SyncProjects(ctx, userID)
	if err != nil {
		return nil, err
	}
	totalResult.Synced += projectResult.Synced
	totalResult.Created += projectResult.Created
	totalResult.Updated += projectResult.Updated

	// Sync time entries for the last 30 days
	endDate := time.Now()
	startDate := endDate.AddDate(0, 0, -30)

	entryResult, err := s.SyncTimeEntries(ctx, userID, startDate, endDate)
	if err != nil {
		return nil, err
	}
	totalResult.Synced += entryResult.Synced
	totalResult.Created += entryResult.Created
	totalResult.Updated += entryResult.Updated

	return totalResult, nil
}

// ValidateAndSaveAPIKey validates a Clockify API key and saves user settings
func (s *Service) ValidateAndSaveAPIKey(ctx context.Context, userID, apiKey string) (*clockify.User, error) {
	// Validate API key by getting user info
	user, err := s.clockify.GetUser(ctx, apiKey)
	if err != nil {
		return nil, err
	}

	// Save settings
	settings := &sync.UserClockifySettings{
		UserID:         userID,
		ClockifyAPIKey: &apiKey,
		ClockifyUserID: &user.ID,
		WorkspaceID:    &user.ActiveWorkspace,
	}

	if err := s.repo.UpdateUserClockifySettings(ctx, settings); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *Service) updateSyncStatusSuccess(ctx context.Context, userID string) {
	now := time.Now()
	nextSync := now.Add(1 * time.Hour) // Next sync in 1 hour

	status := &sync.SyncStatus{
		UserID:         userID,
		LastSyncAt:     &now,
		NextSyncAt:     &nextSync,
		Status:         sync.SyncStatusHealthy,
		PendingChanges: 0,
		ErrorMessage:   nil,
	}

	if err := s.repo.UpdateSyncStatus(ctx, status); err != nil {
		log.Error().Err(err).Str("userID", userID).Msg("failed to update sync status")
	}
}

func (s *Service) updateSyncStatusError(ctx context.Context, userID, errorMsg string) {
	now := time.Now()
	nextSync := now.Add(15 * time.Minute) // Retry in 15 minutes

	status := &sync.SyncStatus{
		UserID:       userID,
		LastSyncAt:   &now,
		NextSyncAt:   &nextSync,
		Status:       sync.SyncStatusError,
		ErrorMessage: &errorMsg,
	}

	if err := s.repo.UpdateSyncStatus(ctx, status); err != nil {
		log.Error().Err(err).Str("userID", userID).Msg("failed to update sync status")
	}
}
