package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kensan/backend/services/sync/internal"
)

var (
	ErrUserNotFound     = errors.New("user not found")
	ErrAPIKeyNotFound   = errors.New("clockify API key not found")
	ErrSyncStatusNotFound = errors.New("sync status not found")
)

// PostgresRepository handles database operations for sync
type PostgresRepository struct {
	db *pgxpool.Pool
}

// Ensure PostgresRepository implements Repository interface
var _ Repository = (*PostgresRepository)(nil)

// NewPostgresRepository creates a new sync repository
func NewPostgresRepository(db *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{db: db}
}

// GetSyncStatus retrieves the sync status for a user
func (r *PostgresRepository) GetSyncStatus(ctx context.Context, userID string) (*sync.SyncStatus, error) {
	query := `
		SELECT user_id, last_sync_at, next_sync_at, status, pending_changes, error_message
		FROM sync_status
		WHERE user_id = $1
	`

	var status sync.SyncStatus
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&status.UserID,
		&status.LastSyncAt,
		&status.NextSyncAt,
		&status.Status,
		&status.PendingChanges,
		&status.ErrorMessage,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// Return default status if not found
			return &sync.SyncStatus{
				UserID:         userID,
				Status:         sync.SyncStatusPending,
				PendingChanges: 0,
			}, nil
		}
		return nil, err
	}

	return &status, nil
}

// UpdateSyncStatus updates or inserts the sync status for a user
func (r *PostgresRepository) UpdateSyncStatus(ctx context.Context, status *sync.SyncStatus) error {
	query := `
		INSERT INTO sync_status (user_id, last_sync_at, next_sync_at, status, pending_changes, error_message, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
		ON CONFLICT (user_id) DO UPDATE SET
			last_sync_at = EXCLUDED.last_sync_at,
			next_sync_at = EXCLUDED.next_sync_at,
			status = EXCLUDED.status,
			pending_changes = EXCLUDED.pending_changes,
			error_message = EXCLUDED.error_message,
			updated_at = NOW()
	`

	_, err := r.db.Exec(ctx, query,
		status.UserID,
		status.LastSyncAt,
		status.NextSyncAt,
		status.Status,
		status.PendingChanges,
		status.ErrorMessage,
	)
	return err
}

// GetUserClockifySettings retrieves Clockify settings for a user
func (r *PostgresRepository) GetUserClockifySettings(ctx context.Context, userID string) (*sync.UserClockifySettings, error) {
	query := `
		SELECT user_id, clockify_api_key, clockify_user_id, workspace_id, default_project_id
		FROM user_settings
		WHERE user_id = $1
	`

	var settings sync.UserClockifySettings
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&settings.UserID,
		&settings.ClockifyAPIKey,
		&settings.ClockifyUserID,
		&settings.WorkspaceID,
		&settings.DefaultProjectID,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	return &settings, nil
}

// UpdateUserClockifySettings updates Clockify settings for a user
func (r *PostgresRepository) UpdateUserClockifySettings(ctx context.Context, settings *sync.UserClockifySettings) error {
	query := `
		INSERT INTO user_settings (user_id, clockify_api_key, clockify_user_id, workspace_id, default_project_id, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
		ON CONFLICT (user_id) DO UPDATE SET
			clockify_api_key = EXCLUDED.clockify_api_key,
			clockify_user_id = EXCLUDED.clockify_user_id,
			workspace_id = EXCLUDED.workspace_id,
			default_project_id = EXCLUDED.default_project_id,
			updated_at = NOW()
	`

	_, err := r.db.Exec(ctx, query,
		settings.UserID,
		settings.ClockifyAPIKey,
		settings.ClockifyUserID,
		settings.WorkspaceID,
		settings.DefaultProjectID,
	)
	return err
}

// UpsertProject upserts a project from Clockify
func (r *PostgresRepository) UpsertProject(ctx context.Context, userID, projectID, name, color string, archived bool, clientID, clientName *string) (created bool, err error) {
	query := `
		INSERT INTO projects (id, user_id, clockify_id, name, color, archived, client_id, client_name, created_at, updated_at)
		VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
		ON CONFLICT (user_id, clockify_id) DO UPDATE SET
			name = EXCLUDED.name,
			color = EXCLUDED.color,
			archived = EXCLUDED.archived,
			client_id = EXCLUDED.client_id,
			client_name = EXCLUDED.client_name,
			updated_at = NOW()
		RETURNING (xmax = 0) AS inserted
	`

	err = r.db.QueryRow(ctx, query, userID, projectID, name, color, archived, clientID, clientName).Scan(&created)
	return
}

// UpsertTimeEntry upserts a time entry from Clockify
func (r *PostgresRepository) UpsertTimeEntry(ctx context.Context, userID, entryID, description, projectID string, taskID *string, start, end time.Time, duration string) (created bool, err error) {
	query := `
		INSERT INTO time_entries (id, user_id, clockify_id, description, project_id, task_id, start_time, end_time, duration, created_at, updated_at)
		VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
		ON CONFLICT (user_id, clockify_id) DO UPDATE SET
			description = EXCLUDED.description,
			project_id = EXCLUDED.project_id,
			task_id = EXCLUDED.task_id,
			start_time = EXCLUDED.start_time,
			end_time = EXCLUDED.end_time,
			duration = EXCLUDED.duration,
			updated_at = NOW()
		RETURNING (xmax = 0) AS inserted
	`

	err = r.db.QueryRow(ctx, query, userID, entryID, description, projectID, taskID, start, end, duration).Scan(&created)
	return
}

// GetProjectByClockifyID retrieves a project by its Clockify ID
func (r *PostgresRepository) GetProjectByClockifyID(ctx context.Context, userID, clockifyID string) (exists bool, err error) {
	query := `SELECT EXISTS(SELECT 1 FROM projects WHERE user_id = $1 AND clockify_id = $2)`
	err = r.db.QueryRow(ctx, query, userID, clockifyID).Scan(&exists)
	return
}

// GetTimeEntryByClockifyID retrieves a time entry by its Clockify ID
func (r *PostgresRepository) GetTimeEntryByClockifyID(ctx context.Context, userID, clockifyID string) (exists bool, err error) {
	query := `SELECT EXISTS(SELECT 1 FROM time_entries WHERE user_id = $1 AND clockify_id = $2)`
	err = r.db.QueryRow(ctx, query, userID, clockifyID).Scan(&exists)
	return
}
