package handler

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/kensan/backend/services/note/internal"
	"github.com/kensan/backend/services/note/internal/service"
	"github.com/kensan/backend/shared/middleware"
)

// Handler handles HTTP requests for note operations
type Handler struct {
	service *service.Service
}

// NewHandler creates a new note handler
func NewHandler(svc *service.Service) *Handler {
	return &Handler{service: svc}
}

// RegisterRoutes registers the note routes.
// Authentication middleware is expected to be applied by the caller.
func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Get("/notes", h.List)
	r.Post("/notes", h.Create)
	r.Get("/notes/search", h.Search)
	r.Get("/notes/{noteId}", h.GetByID)
	r.Put("/notes/{noteId}", h.Update)
	r.Delete("/notes/{noteId}", h.Delete)
	r.Post("/notes/{noteId}/archive", h.Archive)
}

// List handles listing notes
// GET /notes
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		middleware.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	// Parse query parameters for filtering
	filter := &note.NoteFilter{}

	if typesParam := r.URL.Query().Get("types"); typesParam != "" {
		types := strings.Split(typesParam, ",")
		for _, t := range types {
			noteType := note.NoteType(strings.TrimSpace(t))
			if noteType.IsValid() {
				filter.Types = append(filter.Types, noteType)
			}
		}
	}
	if goalID := r.URL.Query().Get("goal_id"); goalID != "" {
		filter.GoalID = &goalID
	}
	if milestoneID := r.URL.Query().Get("milestone_id"); milestoneID != "" {
		filter.MilestoneID = &milestoneID
	}
	if taskID := r.URL.Query().Get("task_id"); taskID != "" {
		filter.TaskID = &taskID
	}
	if formatStr := r.URL.Query().Get("format"); formatStr != "" {
		format := note.NoteFormat(formatStr)
		if format.IsValid() {
			filter.Format = &format
		}
	}
	if dateFrom := r.URL.Query().Get("date_from"); dateFrom != "" {
		filter.DateFrom = &dateFrom
	}
	if dateTo := r.URL.Query().Get("date_to"); dateTo != "" {
		filter.DateTo = &dateTo
	}
	if archivedStr := r.URL.Query().Get("archived"); archivedStr != "" {
		archived := archivedStr == "true"
		filter.Archived = &archived
	}
	if query := r.URL.Query().Get("q"); query != "" {
		filter.Query = &query
	}
	if tagIDsParam := r.URL.Query().Get("tag_ids"); tagIDsParam != "" {
		filter.TagIDs = strings.Split(tagIDsParam, ",")
	}

	notes, err := h.service.List(r.Context(), userID, filter)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	middleware.JSON(w, r, http.StatusOK, notes)
}

// GetByID handles getting a note by ID
// GET /notes/{noteId}
func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		middleware.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	noteID, ok := middleware.RequireURLParam(w, r, "noteId")
	if !ok {
		return
	}

	n, err := h.service.GetByID(r.Context(), userID, noteID)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	middleware.JSON(w, r, http.StatusOK, n)
}

// Create handles creating a new note
// POST /notes
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		middleware.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	var input note.CreateNoteInput
	if !middleware.DecodeJSONBody(w, r, &input) {
		return
	}

	n, err := h.service.Create(r.Context(), userID, &input)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	middleware.JSON(w, r, http.StatusCreated, n)
}

// Update handles updating a note
// PUT /notes/{noteId}
func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		middleware.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	noteID, ok := middleware.RequireURLParam(w, r, "noteId")
	if !ok {
		return
	}

	var input note.UpdateNoteInput
	if !middleware.DecodeJSONBody(w, r, &input) {
		return
	}

	n, err := h.service.Update(r.Context(), userID, noteID, &input)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	middleware.JSON(w, r, http.StatusOK, n)
}

// Delete handles deleting a note
// DELETE /notes/{noteId}
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		middleware.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	noteID, ok := middleware.RequireURLParam(w, r, "noteId")
	if !ok {
		return
	}

	if err := h.service.Delete(r.Context(), userID, noteID); err != nil {
		h.handleError(w, r, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Archive handles archiving/unarchiving a note
// POST /notes/{noteId}/archive
func (h *Handler) Archive(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		middleware.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	noteID, ok := middleware.RequireURLParam(w, r, "noteId")
	if !ok {
		return
	}

	var input struct {
		Archived bool `json:"archived"`
	}
	if !middleware.DecodeJSONBody(w, r, &input) {
		return
	}

	n, err := h.service.Archive(r.Context(), userID, noteID, input.Archived)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	middleware.JSON(w, r, http.StatusOK, n)
}

// Search handles searching notes
// GET /notes/search
func (h *Handler) Search(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		middleware.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	query := r.URL.Query().Get("q")

	// Parse filter
	filter := &note.NoteFilter{}
	if typesParam := r.URL.Query().Get("types"); typesParam != "" {
		types := strings.Split(typesParam, ",")
		for _, t := range types {
			noteType := note.NoteType(strings.TrimSpace(t))
			if noteType.IsValid() {
				filter.Types = append(filter.Types, noteType)
			}
		}
	}
	if archivedStr := r.URL.Query().Get("archived"); archivedStr != "" {
		archived := archivedStr == "true"
		filter.Archived = &archived
	}

	// Parse limit
	limit := 20
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	results, err := h.service.Search(r.Context(), userID, query, filter, limit)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	middleware.JSON(w, r, http.StatusOK, results)
}

// handleError handles service errors and returns appropriate HTTP responses
func (h *Handler) handleError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, service.ErrNoteNotFound):
		middleware.Error(w, r, http.StatusNotFound, "NOTE_NOT_FOUND", "Note not found")
	case errors.Is(err, service.ErrUnauthorized):
		middleware.Error(w, r, http.StatusForbidden, "FORBIDDEN", "Not authorized to access this note")
	case errors.Is(err, service.ErrTypeRequired):
		middleware.ValidationError(w, r, []middleware.ErrorDetail{{Field: "type", Message: "Type is required"}})
	case errors.Is(err, service.ErrInvalidType):
		middleware.ValidationError(w, r, []middleware.ErrorDetail{{Field: "type", Message: "Type must be diary, learning, or memo"}})
	case errors.Is(err, service.ErrTitleRequired):
		middleware.ValidationError(w, r, []middleware.ErrorDetail{{Field: "title", Message: "Title is required for diary and learning notes"}})
	case errors.Is(err, service.ErrContentRequired):
		middleware.ValidationError(w, r, []middleware.ErrorDetail{{Field: "content", Message: "Content is required"}})
	case errors.Is(err, service.ErrFormatRequired):
		middleware.ValidationError(w, r, []middleware.ErrorDetail{{Field: "format", Message: "Format is required"}})
	case errors.Is(err, service.ErrInvalidFormat):
		middleware.ValidationError(w, r, []middleware.ErrorDetail{{Field: "format", Message: "Format must be markdown or drawio"}})
	case errors.Is(err, service.ErrDateRequired):
		middleware.ValidationError(w, r, []middleware.ErrorDetail{{Field: "date", Message: "Date is required for diary notes"}})
	case errors.Is(err, service.ErrQueryRequired):
		middleware.ValidationError(w, r, []middleware.ErrorDetail{{Field: "q", Message: "Query is required for search"}})
	default:
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "An internal error occurred")
	}
}
