package sync

import "time"

// SyncStatus represents the synchronization status for a user
type SyncStatus struct {
	UserID         string     `json:"userId"`
	LastSyncAt     *time.Time `json:"lastSyncAt"`
	NextSyncAt     *time.Time `json:"nextSyncAt"`
	Status         string     `json:"status"` // "healthy", "error", "pending"
	PendingChanges int        `json:"pendingChanges"`
	ErrorMessage   *string    `json:"errorMessage,omitempty"`
}

// SyncResult represents the result of a sync operation
type SyncResult struct {
	Synced  int `json:"synced"`
	Created int `json:"created"`
	Updated int `json:"updated"`
}

// UserClockifySettings represents user's Clockify integration settings
type UserClockifySettings struct {
	UserID           string  `json:"userId"`
	ClockifyAPIKey   *string `json:"clockifyApiKey,omitempty"`
	ClockifyUserID   *string `json:"clockifyUserId,omitempty"`
	WorkspaceID      *string `json:"workspaceId,omitempty"`
	DefaultProjectID *string `json:"defaultProjectId,omitempty"`
}

// SyncStatusHealthy indicates successful sync state
const SyncStatusHealthy = "healthy"

// SyncStatusError indicates sync error state
const SyncStatusError = "error"

// SyncStatusPending indicates sync is pending
const SyncStatusPending = "pending"
