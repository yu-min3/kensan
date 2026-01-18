package clockify

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Client is a Clockify API client
type Client struct {
	baseURL    string
	httpClient *http.Client
}

// NewClient creates a new Clockify client
func NewClient(baseURL string) *Client {
	return &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// Workspace represents a Clockify workspace
type Workspace struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	MembersCount int    `json:"memberships,omitempty"`
}

// Project represents a Clockify project
type Project struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Color      string `json:"color"`
	Archived   bool   `json:"archived"`
	ClientID   string `json:"clientId,omitempty"`
	ClientName string `json:"clientName,omitempty"`
}

// TimeEntry represents a Clockify time entry
type TimeEntry struct {
	ID           string    `json:"id"`
	Description  string    `json:"description"`
	ProjectID    string    `json:"projectId"`
	TaskID       string    `json:"taskId,omitempty"`
	TimeInterval TimeInterval `json:"timeInterval"`
}

// TimeInterval represents start and end time
type TimeInterval struct {
	Start    time.Time `json:"start"`
	End      time.Time `json:"end"`
	Duration string    `json:"duration"`
}

// GetWorkspaces retrieves all workspaces for the user
func (c *Client) GetWorkspaces(ctx context.Context, apiKey string) ([]Workspace, error) {
	req, err := c.newRequest(ctx, "GET", "/workspaces", apiKey)
	if err != nil {
		return nil, err
	}

	var workspaces []Workspace
	if err := c.do(req, &workspaces); err != nil {
		return nil, err
	}

	return workspaces, nil
}

// GetProjects retrieves all projects in a workspace
func (c *Client) GetProjects(ctx context.Context, apiKey, workspaceID string) ([]Project, error) {
	path := fmt.Sprintf("/workspaces/%s/projects", workspaceID)
	req, err := c.newRequest(ctx, "GET", path, apiKey)
	if err != nil {
		return nil, err
	}

	var projects []Project
	if err := c.do(req, &projects); err != nil {
		return nil, err
	}

	return projects, nil
}

// GetTimeEntries retrieves time entries for a user in a workspace
func (c *Client) GetTimeEntries(ctx context.Context, apiKey, workspaceID, userID string, start, end time.Time) ([]TimeEntry, error) {
	path := fmt.Sprintf("/workspaces/%s/user/%s/time-entries?start=%s&end=%s",
		workspaceID, userID,
		start.Format(time.RFC3339),
		end.Format(time.RFC3339),
	)
	req, err := c.newRequest(ctx, "GET", path, apiKey)
	if err != nil {
		return nil, err
	}

	var entries []TimeEntry
	if err := c.do(req, &entries); err != nil {
		return nil, err
	}

	return entries, nil
}

// GetUser retrieves the current user
func (c *Client) GetUser(ctx context.Context, apiKey string) (*User, error) {
	req, err := c.newRequest(ctx, "GET", "/user", apiKey)
	if err != nil {
		return nil, err
	}

	var user User
	if err := c.do(req, &user); err != nil {
		return nil, err
	}

	return &user, nil
}

// User represents a Clockify user
type User struct {
	ID             string `json:"id"`
	Email          string `json:"email"`
	Name           string `json:"name"`
	ActiveWorkspace string `json:"activeWorkspace"`
}

func (c *Client) newRequest(ctx context.Context, method, path, apiKey string) (*http.Request, error) {
	url := c.baseURL + path
	req, err := http.NewRequestWithContext(ctx, method, url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("X-Api-Key", apiKey)
	req.Header.Set("Content-Type", "application/json")

	return req, nil
}

func (c *Client) do(req *http.Request, v interface{}) error {
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(body))
	}

	if v != nil {
		if err := json.NewDecoder(resp.Body).Decode(v); err != nil {
			return fmt.Errorf("failed to decode response: %w", err)
		}
	}

	return nil
}
