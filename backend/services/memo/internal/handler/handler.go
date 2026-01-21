package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	memo "github.com/kensan/backend/services/memo/internal"
	"github.com/kensan/backend/services/memo/internal/service"
	"github.com/kensan/backend/shared/middleware"
)

// Handler handles HTTP requests for memos
type Handler struct {
	service *service.Service
}

// NewHandler creates a new memo handler
func NewHandler(service *service.Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registers the memo routes.
// Authentication middleware is expected to be applied by the caller.
func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Get("/memos", h.List)
	r.Post("/memos", h.Create)
	r.Get("/memos/{memoId}", h.GetByID)
	r.Patch("/memos/{memoId}", h.Update)
	r.Post("/memos/{memoId}/archive", h.Archive)
	r.Delete("/memos/{memoId}", h.Delete)
}

// List handles GET /memos
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	filter := memo.MemoFilter{}

	// Parse archived filter
	if archived := r.URL.Query().Get("archived"); archived != "" {
		a := archived == "true"
		filter.Archived = &a
	}

	// Parse include_all filter
	if includeAll := r.URL.Query().Get("include_all"); includeAll == "true" {
		filter.IncludeAll = true
	}

	// Parse date filter
	if date := r.URL.Query().Get("date"); date != "" {
		filter.Date = &date
	}

	// Parse limit
	if limit := r.URL.Query().Get("limit"); limit != "" {
		if l, err := strconv.Atoi(limit); err == nil && l > 0 {
			filter.Limit = l
		}
	}

	memos, err := h.service.List(r.Context(), userID, filter)
	if err != nil {
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list memos")
		return
	}

	middleware.JSON(w, r, http.StatusOK, memos)
}

// GetByID handles GET /memos/{memoId}
func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	memoID := chi.URLParam(r, "memoId")

	m, err := h.service.GetByID(r.Context(), userID, memoID)
	if err != nil {
		if errors.Is(err, service.ErrMemoNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "MEMO_NOT_FOUND", "Memo not found")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get memo")
		return
	}

	middleware.JSON(w, r, http.StatusOK, m)
}

// Create handles POST /memos
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var input memo.CreateMemoInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		middleware.Error(w, r, http.StatusBadRequest, "INVALID_JSON", "Invalid JSON body")
		return
	}

	// Validation
	if input.Content == "" {
		middleware.ValidationError(w, r, []middleware.ErrorDetail{
			{Field: "content", Message: "Content is required"},
		})
		return
	}

	m, err := h.service.Create(r.Context(), userID, input)
	if err != nil {
		if errors.Is(err, service.ErrInvalidInput) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_INPUT", "Invalid input")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create memo")
		return
	}

	middleware.JSON(w, r, http.StatusCreated, m)
}

// Update handles PATCH /memos/{memoId}
func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	memoID := chi.URLParam(r, "memoId")

	var input memo.UpdateMemoInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		middleware.Error(w, r, http.StatusBadRequest, "INVALID_JSON", "Invalid JSON body")
		return
	}

	m, err := h.service.Update(r.Context(), userID, memoID, input)
	if err != nil {
		if errors.Is(err, service.ErrMemoNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "MEMO_NOT_FOUND", "Memo not found")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update memo")
		return
	}

	middleware.JSON(w, r, http.StatusOK, m)
}

// Archive handles POST /memos/{memoId}/archive
func (h *Handler) Archive(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	memoID := chi.URLParam(r, "memoId")

	m, err := h.service.Archive(r.Context(), userID, memoID)
	if err != nil {
		if errors.Is(err, service.ErrMemoNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "MEMO_NOT_FOUND", "Memo not found")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to archive memo")
		return
	}

	middleware.JSON(w, r, http.StatusOK, m)
}

// Delete handles DELETE /memos/{memoId}
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	memoID := chi.URLParam(r, "memoId")

	err := h.service.Delete(r.Context(), userID, memoID)
	if err != nil {
		if errors.Is(err, service.ErrMemoNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "MEMO_NOT_FOUND", "Memo not found")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete memo")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
