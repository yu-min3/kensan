package e2e

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
)

// ClockifyMock is a mock Clockify API server
type ClockifyMock struct {
	server     *httptest.Server
	mu         sync.RWMutex
	workspaces []ClockifyWorkspace
	projects   []ClockifyProject
	entries    []ClockifyTimeEntry
	user       ClockifyUser
}

// ClockifyWorkspace represents a Clockify workspace
type ClockifyWorkspace struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// ClockifyProject represents a Clockify project
type ClockifyProject struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Color    string `json:"color"`
	Archived bool   `json:"archived"`
}

// ClockifyTimeEntry represents a Clockify time entry
type ClockifyTimeEntry struct {
	ID           string `json:"id"`
	Description  string `json:"description"`
	ProjectID    string `json:"projectId"`
	TimeInterval struct {
		Start    string `json:"start"`
		End      string `json:"end"`
		Duration string `json:"duration"`
	} `json:"timeInterval"`
}

// ClockifyUser represents a Clockify user
type ClockifyUser struct {
	ID              string `json:"id"`
	Email           string `json:"email"`
	Name            string `json:"name"`
	ActiveWorkspace string `json:"activeWorkspace"`
}

// NewClockifyMock creates a new Clockify mock server
func NewClockifyMock() *ClockifyMock {
	mock := &ClockifyMock{
		workspaces: []ClockifyWorkspace{
			{ID: "mock-workspace-id", Name: "Test Workspace"},
		},
		projects: []ClockifyProject{
			{ID: "proj-1", Name: "Project Alpha", Color: "#FF0000", Archived: false},
			{ID: "proj-2", Name: "Project Beta", Color: "#00FF00", Archived: false},
		},
		entries: []ClockifyTimeEntry{
			{
				ID:          "entry-1",
				Description: "Working on feature",
				ProjectID:   "proj-1",
				TimeInterval: struct {
					Start    string `json:"start"`
					End      string `json:"end"`
					Duration string `json:"duration"`
				}{
					Start:    "2024-01-15T09:00:00Z",
					End:      "2024-01-15T10:30:00Z",
					Duration: "PT1H30M",
				},
			},
		},
		user: ClockifyUser{
			ID:              "mock-clockify-user-id",
			Email:           "test@example.com",
			Name:            "Test User",
			ActiveWorkspace: "mock-workspace-id",
		},
	}

	mock.server = httptest.NewServer(http.HandlerFunc(mock.handler))
	return mock
}

// URL returns the mock server URL
func (m *ClockifyMock) URL() string {
	return m.server.URL
}

// Close closes the mock server
func (m *ClockifyMock) Close() {
	m.server.Close()
}

// SetUser sets the mock user
func (m *ClockifyMock) SetUser(user ClockifyUser) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.user = user
}

// SetWorkspaces sets the mock workspaces
func (m *ClockifyMock) SetWorkspaces(workspaces []ClockifyWorkspace) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.workspaces = workspaces
}

// SetProjects sets the mock projects
func (m *ClockifyMock) SetProjects(projects []ClockifyProject) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.projects = projects
}

// SetTimeEntries sets the mock time entries
func (m *ClockifyMock) SetTimeEntries(entries []ClockifyTimeEntry) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.entries = entries
}

// handler handles mock HTTP requests
func (m *ClockifyMock) handler(w http.ResponseWriter, r *http.Request) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	w.Header().Set("Content-Type", "application/json")

	// Check API key
	apiKey := r.Header.Get("X-Api-Key")
	if apiKey == "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"message": "API key required"})
		return
	}

	// Handle invalid API key
	if apiKey == "invalid-api-key" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"message": "Invalid API key"})
		return
	}

	path := r.URL.Path

	switch {
	case path == "/user":
		json.NewEncoder(w).Encode(m.user)

	case path == "/workspaces":
		json.NewEncoder(w).Encode(m.workspaces)

	case strings.HasSuffix(path, "/projects"):
		json.NewEncoder(w).Encode(m.projects)

	case strings.Contains(path, "/time-entries"):
		json.NewEncoder(w).Encode(m.entries)

	default:
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"message": "Not found"})
	}
}
