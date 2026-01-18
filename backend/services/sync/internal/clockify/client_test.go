package clockify

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ========== HTTP Mock Tests (always run) ==========

func TestClient_GetWorkspaces_MockServer(t *testing.T) {
	mockWorkspaces := []Workspace{
		{ID: "ws1", Name: "Personal"},
		{ID: "ws2", Name: "Work"},
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodGet, r.Method)
		assert.Equal(t, "/workspaces", r.URL.Path)
		assert.Equal(t, "test-api-key", r.Header.Get("X-Api-Key"))
		assert.Equal(t, "application/json", r.Header.Get("Content-Type"))

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(mockWorkspaces)
	}))
	defer server.Close()

	client := NewClient(server.URL)
	workspaces, err := client.GetWorkspaces(context.Background(), "test-api-key")

	require.NoError(t, err)
	assert.Len(t, workspaces, 2)
	assert.Equal(t, "ws1", workspaces[0].ID)
	assert.Equal(t, "Personal", workspaces[0].Name)
}

func TestClient_GetProjects_MockServer(t *testing.T) {
	mockProjects := []Project{
		{ID: "p1", Name: "Project Alpha", Color: "#FF0000", Archived: false},
		{ID: "p2", Name: "Project Beta", Color: "#00FF00", Archived: true},
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodGet, r.Method)
		assert.Equal(t, "/workspaces/ws123/projects", r.URL.Path)
		assert.Equal(t, "test-api-key", r.Header.Get("X-Api-Key"))

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(mockProjects)
	}))
	defer server.Close()

	client := NewClient(server.URL)
	projects, err := client.GetProjects(context.Background(), "test-api-key", "ws123")

	require.NoError(t, err)
	assert.Len(t, projects, 2)
	assert.Equal(t, "Project Alpha", projects[0].Name)
	assert.False(t, projects[0].Archived)
	assert.True(t, projects[1].Archived)
}

func TestClient_GetTimeEntries_MockServer(t *testing.T) {
	start := time.Date(2024, 1, 15, 9, 0, 0, 0, time.UTC)
	end := time.Date(2024, 1, 15, 10, 30, 0, 0, time.UTC)

	mockEntries := []TimeEntry{
		{
			ID:          "te1",
			Description: "Working on feature",
			ProjectID:   "p1",
			TimeInterval: TimeInterval{
				Start:    start,
				End:      end,
				Duration: "PT1H30M",
			},
		},
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodGet, r.Method)
		assert.Contains(t, r.URL.Path, "/workspaces/ws123/user/user456/time-entries")
		assert.Contains(t, r.URL.RawQuery, "start=")
		assert.Contains(t, r.URL.RawQuery, "end=")

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(mockEntries)
	}))
	defer server.Close()

	client := NewClient(server.URL)
	entries, err := client.GetTimeEntries(
		context.Background(),
		"test-api-key",
		"ws123",
		"user456",
		start,
		end,
	)

	require.NoError(t, err)
	assert.Len(t, entries, 1)
	assert.Equal(t, "Working on feature", entries[0].Description)
	assert.Equal(t, "PT1H30M", entries[0].TimeInterval.Duration)
}

func TestClient_GetUser_MockServer(t *testing.T) {
	mockUser := User{
		ID:              "user123",
		Email:           "test@example.com",
		Name:            "Test User",
		ActiveWorkspace: "ws1",
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodGet, r.Method)
		assert.Equal(t, "/user", r.URL.Path)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(mockUser)
	}))
	defer server.Close()

	client := NewClient(server.URL)
	user, err := client.GetUser(context.Background(), "test-api-key")

	require.NoError(t, err)
	assert.Equal(t, "user123", user.ID)
	assert.Equal(t, "test@example.com", user.Email)
	assert.Equal(t, "Test User", user.Name)
}

func TestClient_APIError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"message": "Invalid API key"}`))
	}))
	defer server.Close()

	client := NewClient(server.URL)
	workspaces, err := client.GetWorkspaces(context.Background(), "invalid-key")

	assert.Error(t, err)
	assert.Nil(t, workspaces)
	assert.Contains(t, err.Error(), "401")
}

func TestClient_NotFound(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte(`{"message": "Workspace not found"}`))
	}))
	defer server.Close()

	client := NewClient(server.URL)
	projects, err := client.GetProjects(context.Background(), "test-key", "nonexistent")

	assert.Error(t, err)
	assert.Nil(t, projects)
	assert.Contains(t, err.Error(), "404")
}

// ========== Real API Tests (skip if CLOCKIFY_API_KEY not set) ==========

func TestClient_RealAPI_GetWorkspaces(t *testing.T) {
	apiKey := os.Getenv("CLOCKIFY_API_KEY")
	if apiKey == "" {
		t.Skip("CLOCKIFY_API_KEY not set, skipping real API test")
	}

	client := NewClient("https://api.clockify.me/api/v1")
	workspaces, err := client.GetWorkspaces(context.Background(), apiKey)

	require.NoError(t, err)
	assert.NotEmpty(t, workspaces)

	t.Logf("Found %d workspaces", len(workspaces))
	for _, ws := range workspaces {
		t.Logf("  - %s: %s", ws.ID, ws.Name)
	}
}

func TestClient_RealAPI_GetUser(t *testing.T) {
	apiKey := os.Getenv("CLOCKIFY_API_KEY")
	if apiKey == "" {
		t.Skip("CLOCKIFY_API_KEY not set, skipping real API test")
	}

	client := NewClient("https://api.clockify.me/api/v1")
	user, err := client.GetUser(context.Background(), apiKey)

	require.NoError(t, err)
	assert.NotEmpty(t, user.ID)
	assert.NotEmpty(t, user.Email)

	t.Logf("User: %s (%s)", user.Name, user.Email)
	t.Logf("Active Workspace: %s", user.ActiveWorkspace)
}

func TestClient_RealAPI_GetProjects(t *testing.T) {
	apiKey := os.Getenv("CLOCKIFY_API_KEY")
	workspaceID := os.Getenv("CLOCKIFY_WORKSPACE_ID")
	if apiKey == "" || workspaceID == "" {
		t.Skip("CLOCKIFY_API_KEY or CLOCKIFY_WORKSPACE_ID not set, skipping real API test")
	}

	client := NewClient("https://api.clockify.me/api/v1")
	projects, err := client.GetProjects(context.Background(), apiKey, workspaceID)

	require.NoError(t, err)

	t.Logf("Found %d projects", len(projects))
	for _, p := range projects {
		archived := ""
		if p.Archived {
			archived = " (archived)"
		}
		t.Logf("  - %s: %s%s", p.ID, p.Name, archived)
	}
}
