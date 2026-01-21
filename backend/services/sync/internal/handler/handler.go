package handler

import (
	"encoding/json"
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
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.Error(w, r, http.StatusBadRequest, "INVALID_REQUEST", "リクエストの形式が不正です")
		return
	}

	if req.APIKey == "" {
		middleware.ValidationError(w, r, []middleware.ErrorDetail{
			{Field: "apiKey", Message: "APIキーは必須です"},
		})
		return
	}

	userID := middleware.GetUserID(r.Context())

	// Validate and save API key
	user, err := h.service.ValidateAndSaveAPIKey(r.Context(), userID, req.APIKey)
	if err != nil {
		middleware.Error(w, r, http.StatusBadRequest, "CLOCKIFY_ERROR", "Clockify APIキーが無効です: "+err.Error())
		return
	}

	// Get workspaces
	workspaces, err := h.service.GetWorkspaces(r.Context(), req.APIKey)
	if err != nil {
		middleware.Error(w, r, http.StatusInternalServerError, "CLOCKIFY_ERROR", "ワークスペースの取得に失敗しました")
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
			middleware.Error(w, r, http.StatusBadRequest, "API_KEY_REQUIRED", "Clockify APIキーが設定されていません")
		case service.ErrWorkspaceRequired:
			middleware.Error(w, r, http.StatusBadRequest, "WORKSPACE_REQUIRED", "ワークスペースが設定されていません")
		default:
			middleware.Error(w, r, http.StatusInternalServerError, "SYNC_ERROR", "プロジェクトの同期に失敗しました")
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
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.Error(w, r, http.StatusBadRequest, "INVALID_REQUEST", "リクエストの形式が不正です")
		return
	}

	// Parse dates
	startDate, err := time.Parse(time.RFC3339, req.StartDate)
	if err != nil {
		middleware.ValidationError(w, r, []middleware.ErrorDetail{
			{Field: "startDate", Message: "日付の形式が不正です（RFC3339形式で指定してください）"},
		})
		return
	}

	endDate, err := time.Parse(time.RFC3339, req.EndDate)
	if err != nil {
		middleware.ValidationError(w, r, []middleware.ErrorDetail{
			{Field: "endDate", Message: "日付の形式が不正です（RFC3339形式で指定してください）"},
		})
		return
	}

	if startDate.After(endDate) {
		middleware.ValidationError(w, r, []middleware.ErrorDetail{
			{Field: "startDate", Message: "開始日は終了日より前である必要があります"},
		})
		return
	}

	userID := middleware.GetUserID(r.Context())

	result, err := h.service.SyncTimeEntries(r.Context(), userID, startDate, endDate)
	if err != nil {
		switch err {
		case service.ErrAPIKeyRequired:
			middleware.Error(w, r, http.StatusBadRequest, "API_KEY_REQUIRED", "Clockify APIキーが設定されていません")
		case service.ErrWorkspaceRequired:
			middleware.Error(w, r, http.StatusBadRequest, "WORKSPACE_REQUIRED", "ワークスペースが設定されていません")
		case service.ErrClockifyUserRequired:
			middleware.Error(w, r, http.StatusBadRequest, "USER_REQUIRED", "ClockifyユーザーIDが設定されていません")
		default:
			middleware.Error(w, r, http.StatusInternalServerError, "SYNC_ERROR", "時間記録の同期に失敗しました")
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
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "同期ステータスの取得に失敗しました")
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
			middleware.Error(w, r, http.StatusBadRequest, "API_KEY_REQUIRED", "Clockify APIキーが設定されていません")
		case service.ErrWorkspaceRequired:
			middleware.Error(w, r, http.StatusBadRequest, "WORKSPACE_REQUIRED", "ワークスペースが設定されていません")
		case service.ErrClockifyUserRequired:
			middleware.Error(w, r, http.StatusBadRequest, "USER_REQUIRED", "ClockifyユーザーIDが設定されていません")
		default:
			middleware.Error(w, r, http.StatusInternalServerError, "SYNC_ERROR", "同期に失敗しました")
		}
		return
	}

	middleware.JSON(w, r, http.StatusOK, result)
}
