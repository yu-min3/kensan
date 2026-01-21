package handler

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/kensan/backend/services/sync/internal/service"
	"github.com/kensan/backend/shared/middleware"
)

// Handler handles HTTP requests for sync operations
type Handler struct {
	service *service.Service
}

// NewHandler creates a new sync handler
func NewHandler(svc *service.Service) *Handler {
	return &Handler{service: svc}
}

// RegisterRoutes registers the sync routes.
// Authentication middleware is expected to be applied by the caller.
func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Route("/sync", func(r chi.Router) {
		r.Post("/clockify/workspaces", h.GetWorkspaces)
		r.Post("/clockify/projects", h.SyncProjects)
		r.Post("/clockify/time-entries", h.SyncTimeEntries)
		r.Get("/status", h.GetSyncStatus)
		r.Post("/trigger", h.TriggerSync)
	})
}

// GetWorkspacesRequest represents the request body for getting workspaces
type GetWorkspacesRequest struct {
	APIKey string `json:"apiKey"`
}

// GetWorkspaces handles GET /sync/clockify/workspaces
func (h *Handler) GetWorkspaces(w http.ResponseWriter, r *http.Request) {
	var req GetWorkspacesRequest
	if !middleware.DecodeJSONBody(w, r, &req) {
		return
	}

	if req.APIKey == "" {
		middleware.ValidationError(w, r, []middleware.ErrorDetail{
			{Field: "apiKey", Message: "API key is required"},
		})
		return
	}

	userID := middleware.GetUserID(r.Context())

	// Validate and save API key
	user, err := h.service.ValidateAndSaveAPIKey(r.Context(), userID, req.APIKey)
	if err != nil {
		middleware.Error(w, r, http.StatusBadRequest, "CLOCKIFY_ERROR", "Invalid Clockify API key: "+err.Error())
		return
	}

	// Get workspaces
	workspaces, err := h.service.GetWorkspaces(r.Context(), req.APIKey)
	if err != nil {
		middleware.Error(w, r, http.StatusInternalServerError, "CLOCKIFY_ERROR", "Failed to get workspaces")
		return
	}

	middleware.JSON(w, r, http.StatusOK, map[string]interface{}{
		"user":       user,
		"workspaces": workspaces,
	})
}

// SyncProjects handles POST /sync/clockify/projects
func (h *Handler) SyncProjects(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	result, err := h.service.SyncProjects(r.Context(), userID)
	if err != nil {
		switch err {
		case service.ErrAPIKeyRequired:
			middleware.Error(w, r, http.StatusBadRequest, "API_KEY_REQUIRED", "Clockify API key is not configured")
		case service.ErrWorkspaceRequired:
			middleware.Error(w, r, http.StatusBadRequest, "WORKSPACE_REQUIRED", "Workspace is not configured")
		default:
			middleware.Error(w, r, http.StatusInternalServerError, "SYNC_ERROR", "Failed to sync projects")
		}
		return
	}

	middleware.JSON(w, r, http.StatusOK, result)
}

// SyncTimeEntriesRequest represents the request body for syncing time entries
type SyncTimeEntriesRequest struct {
	StartDate string `json:"startDate"` // RFC3339 format
	EndDate   string `json:"endDate"`   // RFC3339 format
}

// SyncTimeEntries handles POST /sync/clockify/time-entries
func (h *Handler) SyncTimeEntries(w http.ResponseWriter, r *http.Request) {
	var req SyncTimeEntriesRequest
	if !middleware.DecodeJSONBody(w, r, &req) {
		return
	}

	// Parse dates
	startDate, err := time.Parse(time.RFC3339, req.StartDate)
	if err != nil {
		middleware.ValidationError(w, r, []middleware.ErrorDetail{
			{Field: "startDate", Message: "Invalid date format (use RFC3339)"},
		})
		return
	}

	endDate, err := time.Parse(time.RFC3339, req.EndDate)
	if err != nil {
		middleware.ValidationError(w, r, []middleware.ErrorDetail{
			{Field: "endDate", Message: "Invalid date format (use RFC3339)"},
		})
		return
	}

	if startDate.After(endDate) {
		middleware.ValidationError(w, r, []middleware.ErrorDetail{
			{Field: "startDate", Message: "Start date must be before end date"},
		})
		return
	}

	userID := middleware.GetUserID(r.Context())

	result, err := h.service.SyncTimeEntries(r.Context(), userID, startDate, endDate)
	if err != nil {
		switch err {
		case service.ErrAPIKeyRequired:
			middleware.Error(w, r, http.StatusBadRequest, "API_KEY_REQUIRED", "Clockify API key is not configured")
		case service.ErrWorkspaceRequired:
			middleware.Error(w, r, http.StatusBadRequest, "WORKSPACE_REQUIRED", "Workspace is not configured")
		case service.ErrClockifyUserRequired:
			middleware.Error(w, r, http.StatusBadRequest, "USER_REQUIRED", "Clockify user ID is not configured")
		default:
			middleware.Error(w, r, http.StatusInternalServerError, "SYNC_ERROR", "Failed to sync time entries")
		}
		return
	}

	middleware.JSON(w, r, http.StatusOK, result)
}

// GetSyncStatus handles GET /sync/status
func (h *Handler) GetSyncStatus(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	status, err := h.service.GetSyncStatus(r.Context(), userID)
	if err != nil {
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get sync status")
		return
	}

	middleware.JSON(w, r, http.StatusOK, status)
}

// TriggerSync handles POST /sync/trigger
func (h *Handler) TriggerSync(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	result, err := h.service.TriggerSync(r.Context(), userID)
	if err != nil {
		switch err {
		case service.ErrAPIKeyRequired:
			middleware.Error(w, r, http.StatusBadRequest, "API_KEY_REQUIRED", "Clockify API key is not configured")
		case service.ErrWorkspaceRequired:
			middleware.Error(w, r, http.StatusBadRequest, "WORKSPACE_REQUIRED", "Workspace is not configured")
		case service.ErrClockifyUserRequired:
			middleware.Error(w, r, http.StatusBadRequest, "USER_REQUIRED", "Clockify user ID is not configured")
		default:
			middleware.Error(w, r, http.StatusInternalServerError, "SYNC_ERROR", "Failed to sync")
		}
		return
	}

	middleware.JSON(w, r, http.StatusOK, result)
}
