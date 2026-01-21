package e2e

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestClockifySyncFlow tests the complete Clockify sync flow:
// 1. Register and login
// 2. Get workspaces with API key
// 3. Save settings with workspace
// 4. Sync projects
// 5. Check sync status
func TestClockifySyncFlow(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping E2E test in short mode")
	}

	// Setup test environment
	env := SetupTestEnv(t)
	defer env.Cleanup(t)

	// Start services
	env.StartService(t, "user", 18091)
	env.StartService(t, "sync", 18092)

	userURL := env.ServiceURL("user")
	syncURL := env.ServiceURL("sync")

	client := NewHTTPClient(t)

	// Step 1: Register and get token
	t.Run("Setup_RegisterUser", func(t *testing.T) {
		var authResp AuthResponse

		client.Post(userURL+"/api/v1/auth/register", RegisterRequest{
			Email:    "sync-test@example.com",
			Password: "password123",
			Name:     "Sync Test User",
		}).AssertStatus(http.StatusCreated).JSON(&authResp)

		require.NotEmpty(t, authResp.Data.Token)
		client.SetToken(authResp.Data.Token)
	})

	// Step 2: Get workspaces with API key
	t.Run("GetWorkspaces", func(t *testing.T) {
		var resp WorkspacesResponse

		client.Post(syncURL+"/api/v1/sync/clockify/workspaces", WorkspacesRequest{
			APIKey: "valid-test-api-key",
		}).AssertStatus(http.StatusOK).JSON(&resp)

		require.NotEmpty(t, resp.Data.Workspaces)
		assert.Equal(t, "mock-workspace-id", resp.Data.Workspaces[0].ID)
		assert.Equal(t, "Test Workspace", resp.Data.Workspaces[0].Name)

		// User info should also be returned
		assert.Equal(t, "mock-clockify-user-id", resp.Data.User.ID)
		assert.Equal(t, "Test User", resp.Data.User.Name)
	})

	// Step 3: Save workspace settings
	t.Run("SaveWorkspaceSettings", func(t *testing.T) {
		workspaceID := "mock-workspace-id"
		workspaceName := "Test Workspace"

		var settings SettingsResponse
		client.Put(userURL+"/api/v1/users/me/settings", UpdateSettingsRequest{
			WorkspaceID:   &workspaceID,
			WorkspaceName: &workspaceName,
		}).AssertStatus(http.StatusOK).JSON(&settings)

		assert.Equal(t, "mock-workspace-id", settings.Data.WorkspaceID)
		assert.Equal(t, "Test Workspace", settings.Data.WorkspaceName)
	})

	// Step 4: Sync projects
	t.Run("SyncProjects", func(t *testing.T) {
		var result map[string]any

		client.Post(syncURL+"/api/v1/sync/clockify/projects", nil).
			AssertStatus(http.StatusOK).
			JSON(&result)

		// Response is wrapped in "data" field
		data, ok := result["data"].(map[string]any)
		require.True(t, ok, "expected data field in response")

		// SyncResult has synced, created, updated fields
		synced, ok := data["synced"].(float64)
		require.True(t, ok, "expected synced in data")
		assert.GreaterOrEqual(t, int(synced), 0)
	})

	// Step 5: Get sync status
	t.Run("GetSyncStatus", func(t *testing.T) {
		var status map[string]any

		client.Get(syncURL + "/api/v1/sync/status").
			AssertStatus(http.StatusOK).
			JSON(&status)

		// Status should be set
		assert.NotNil(t, status)
	})
}

// TestClockifySyncValidation tests sync validation errors
func TestClockifySyncValidation(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping E2E test in short mode")
	}

	env := SetupTestEnv(t)
	defer env.Cleanup(t)

	env.StartService(t, "user", 18093)
	env.StartService(t, "sync", 18094)

	userURL := env.ServiceURL("user")
	syncURL := env.ServiceURL("sync")

	client := NewHTTPClient(t)

	// Register user
	var authResp AuthResponse
	client.Post(userURL+"/api/v1/auth/register", RegisterRequest{
		Email:    "sync-validation@example.com",
		Password: "password123",
		Name:     "Validation Test User",
	}).AssertStatus(http.StatusCreated).JSON(&authResp)
	client.SetToken(authResp.Data.Token)

	t.Run("GetWorkspacesWithEmptyAPIKey", func(t *testing.T) {
		client.Post(syncURL+"/api/v1/sync/clockify/workspaces", WorkspacesRequest{
			APIKey: "",
		}).AssertStatus(http.StatusBadRequest)
	})

	t.Run("SyncProjectsWithoutAPIKey", func(t *testing.T) {
		// Trying to sync without setting API key first
		client.Post(syncURL+"/api/v1/sync/clockify/projects", nil).
			AssertStatus(http.StatusBadRequest)
	})

	// Note: This test case is skipped because GetWorkspaces also returns
	// the user's activeWorkspace from Clockify, which gets saved.
	// The SyncProjects call can then use that workspace.
	// If you want to test "no workspace" scenario, you need to test
	// without calling GetWorkspaces first (covered by SyncProjectsWithoutAPIKey).

	t.Run("TriggerSyncWithoutSetup", func(t *testing.T) {
		// Trigger sync should fail without proper setup
		client.Post(syncURL+"/api/v1/sync/trigger", nil).
			AssertStatus(http.StatusBadRequest)
	})
}

// TestSyncTimeEntries tests time entries sync
func TestSyncTimeEntries(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping E2E test in short mode")
	}

	env := SetupTestEnv(t)
	defer env.Cleanup(t)

	env.StartService(t, "user", 18095)
	env.StartService(t, "sync", 18096)

	userURL := env.ServiceURL("user")
	syncURL := env.ServiceURL("sync")

	client := NewHTTPClient(t)

	// Setup: Register, get workspaces, set workspace
	var authResp AuthResponse
	client.Post(userURL+"/api/v1/auth/register", RegisterRequest{
		Email:    "time-entries@example.com",
		Password: "password123",
		Name:     "Time Entries User",
	}).AssertStatus(http.StatusCreated).JSON(&authResp)
	client.SetToken(authResp.Data.Token)

	// Get workspaces (this also saves API key and user ID)
	client.Post(syncURL+"/api/v1/sync/clockify/workspaces", WorkspacesRequest{
		APIKey: "valid-test-api-key",
	}).AssertStatus(http.StatusOK)

	// Set workspace
	workspaceID := "mock-workspace-id"
	workspaceName := "Test Workspace"
	client.Put(userURL+"/api/v1/users/me/settings", UpdateSettingsRequest{
		WorkspaceID:   &workspaceID,
		WorkspaceName: &workspaceName,
	}).AssertStatus(http.StatusOK)

	t.Run("SyncTimeEntriesSuccess", func(t *testing.T) {
		var result map[string]any

		client.Post(syncURL+"/api/v1/sync/clockify/time-entries", map[string]string{
			"startDate": "2024-01-01T00:00:00Z",
			"endDate":   "2024-01-31T23:59:59Z",
		}).AssertStatus(http.StatusOK).JSON(&result)

		assert.NotNil(t, result)
	})

	t.Run("SyncTimeEntriesInvalidDateRange", func(t *testing.T) {
		// End date before start date
		client.Post(syncURL+"/api/v1/sync/clockify/time-entries", map[string]string{
			"startDate": "2024-01-31T00:00:00Z",
			"endDate":   "2024-01-01T23:59:59Z",
		}).AssertStatus(http.StatusBadRequest)
	})

	t.Run("SyncTimeEntriesInvalidDateFormat", func(t *testing.T) {
		client.Post(syncURL+"/api/v1/sync/clockify/time-entries", map[string]string{
			"startDate": "invalid-date",
			"endDate":   "2024-01-31T23:59:59Z",
		}).AssertStatus(http.StatusBadRequest)
	})
}

// TestTriggerFullSync tests the full sync trigger
func TestTriggerFullSync(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping E2E test in short mode")
	}

	env := SetupTestEnv(t)
	defer env.Cleanup(t)

	env.StartService(t, "user", 18097)
	env.StartService(t, "sync", 18098)

	userURL := env.ServiceURL("user")
	syncURL := env.ServiceURL("sync")

	client := NewHTTPClient(t)

	// Full setup
	var authResp AuthResponse
	client.Post(userURL+"/api/v1/auth/register", RegisterRequest{
		Email:    "full-sync@example.com",
		Password: "password123",
		Name:     "Full Sync User",
	}).AssertStatus(http.StatusCreated).JSON(&authResp)
	client.SetToken(authResp.Data.Token)

	// Get workspaces
	client.Post(syncURL+"/api/v1/sync/clockify/workspaces", WorkspacesRequest{
		APIKey: "valid-test-api-key",
	}).AssertStatus(http.StatusOK)

	// Set workspace
	workspaceID := "mock-workspace-id"
	workspaceName := "Test Workspace"
	client.Put(userURL+"/api/v1/users/me/settings", UpdateSettingsRequest{
		WorkspaceID:   &workspaceID,
		WorkspaceName: &workspaceName,
	}).AssertStatus(http.StatusOK)

	t.Run("TriggerSync", func(t *testing.T) {
		var result map[string]any

		client.Post(syncURL+"/api/v1/sync/trigger", nil).
			AssertStatus(http.StatusOK).
			JSON(&result)

		assert.NotNil(t, result)
	})

	t.Run("VerifySyncStatus", func(t *testing.T) {
		var status map[string]any

		client.Get(syncURL + "/api/v1/sync/status").
			AssertStatus(http.StatusOK).
			JSON(&status)

		// After sync, status should be updated
		assert.NotNil(t, status)
	})
}

// TestUnauthorizedSyncAccess tests that sync endpoints require authentication
func TestUnauthorizedSyncAccess(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping E2E test in short mode")
	}

	env := SetupTestEnv(t)
	defer env.Cleanup(t)

	env.StartService(t, "sync", 18099)
	syncURL := env.ServiceURL("sync")

	client := NewHTTPClient(t) // No token

	t.Run("GetWorkspacesUnauthorized", func(t *testing.T) {
		client.Post(syncURL+"/api/v1/sync/clockify/workspaces", WorkspacesRequest{
			APIKey: "test-api-key",
		}).AssertStatus(http.StatusUnauthorized)
	})

	t.Run("GetSyncStatusUnauthorized", func(t *testing.T) {
		client.Get(syncURL + "/api/v1/sync/status").
			AssertStatus(http.StatusUnauthorized)
	})

	t.Run("TriggerSyncUnauthorized", func(t *testing.T) {
		client.Post(syncURL+"/api/v1/sync/trigger", nil).
			AssertStatus(http.StatusUnauthorized)
	})
}
