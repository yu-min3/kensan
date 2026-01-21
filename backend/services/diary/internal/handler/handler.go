package handler

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/kensan/backend/services/diary/internal"
	"github.com/kensan/backend/services/diary/internal/service"
	"github.com/kensan/backend/shared/middleware"
)

// Handler handles HTTP requests for diary entry operations
type Handler struct {
	service *service.Service
}

// NewHandler creates a new diary handler
func NewHandler(svc *service.Service) *Handler {
	return &Handler{service: svc}
}

// RegisterRoutes registers the diary routes.
// Authentication middleware is expected to be applied by the caller.
func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Get("/diaries", h.List)
	r.Post("/diaries", h.Create)
	r.Get("/diaries/by-date/{date}", h.GetByDate)
	r.Get("/diaries/{diaryId}", h.GetByID)
	r.Put("/diaries/{diaryId}", h.Update)
	r.Delete("/diaries/{diaryId}", h.Delete)
}

// List handles listing diary entries
// GET /diaries
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		middleware.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	// Parse query parameters for filtering
	filter := &diary.DiaryFilter{}

	if startDate := r.URL.Query().Get("start_date"); startDate != "" {
		filter.StartDate = &startDate
	}
	if endDate := r.URL.Query().Get("end_date"); endDate != "" {
		filter.EndDate = &endDate
	}
	if tag := r.URL.Query().Get("tag"); tag != "" {
		filter.Tag = &tag
	}
	if query := r.URL.Query().Get("q"); query != "" {
		filter.Query = &query
	}

	entries, err := h.service.List(r.Context(), userID, filter)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	middleware.JSON(w, r, http.StatusOK, entries)
}

// GetByID handles getting a diary entry by ID
// GET /diaries/{diaryId}
func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		middleware.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	diaryID, ok := middleware.RequireURLParam(w, r, "diaryId")
	if !ok {
		return
	}

	entry, err := h.service.GetByID(r.Context(), userID, diaryID)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	middleware.JSON(w, r, http.StatusOK, entry)
}

// GetByDate handles getting a diary entry by date
// GET /diaries/by-date/{date}
func (h *Handler) GetByDate(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		middleware.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	date, ok := middleware.RequireURLParam(w, r, "date")
	if !ok {
		return
	}

	entry, err := h.service.GetByDate(r.Context(), userID, date)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	middleware.JSON(w, r, http.StatusOK, entry)
}

// Create handles creating a new diary entry
// POST /diaries
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		middleware.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	var input diary.CreateDiaryInput
	if !middleware.DecodeJSONBody(w, r, &input) {
		return
	}

	entry, err := h.service.Create(r.Context(), userID, &input)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	middleware.JSON(w, r, http.StatusCreated, entry)
}

// Update handles updating a diary entry
// PUT /diaries/{diaryId}
func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		middleware.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	diaryID, ok := middleware.RequireURLParam(w, r, "diaryId")
	if !ok {
		return
	}

	var input diary.UpdateDiaryInput
	if !middleware.DecodeJSONBody(w, r, &input) {
		return
	}

	entry, err := h.service.Update(r.Context(), userID, diaryID, &input)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	middleware.JSON(w, r, http.StatusOK, entry)
}

// Delete handles deleting a diary entry
// DELETE /diaries/{diaryId}
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		middleware.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	diaryID, ok := middleware.RequireURLParam(w, r, "diaryId")
	if !ok {
		return
	}

	if err := h.service.Delete(r.Context(), userID, diaryID); err != nil {
		h.handleError(w, r, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// handleError handles service errors and returns appropriate HTTP responses
func (h *Handler) handleError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, service.ErrDiaryNotFound):
		middleware.Error(w, r, http.StatusNotFound, "DIARY_NOT_FOUND", "Diary entry not found")
	case errors.Is(err, service.ErrUnauthorized):
		middleware.Error(w, r, http.StatusForbidden, "FORBIDDEN", "Not authorized to access this diary entry")
	case errors.Is(err, service.ErrTitleRequired):
		middleware.ValidationError(w, r, []middleware.ErrorDetail{{Field: "title", Message: "Title is required"}})
	case errors.Is(err, service.ErrDateRequired):
		middleware.ValidationError(w, r, []middleware.ErrorDetail{{Field: "date", Message: "Date is required"}})
	case errors.Is(err, service.ErrInvalidDate):
		middleware.ValidationError(w, r, []middleware.ErrorDetail{{Field: "date", Message: "Date must be in YYYY-MM-DD format"}})
	default:
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "An internal error occurred")
	}
}
