package handler

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/kensan/backend/services/record/internal"
	"github.com/kensan/backend/services/record/internal/service"
	sharedErrors "github.com/kensan/backend/shared/errors"
	"github.com/kensan/backend/shared/middleware"
	"github.com/rs/zerolog/log"
)

// Handler handles HTTP requests for learning record operations
type Handler struct {
	service *service.Service
}

// NewHandler creates a new record handler
func NewHandler(svc *service.Service) *Handler {
	return &Handler{service: svc}
}

// RegisterRoutes registers the learning record routes.
// Authentication middleware is expected to be applied by the caller.
func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Get("/records", h.List)
	r.Post("/records", h.Create)
	r.Get("/records/{recordId}", h.GetByID)
	r.Put("/records/{recordId}", h.Update)
	r.Delete("/records/{recordId}", h.Delete)
	r.Post("/records/search/semantic", h.SemanticSearch)
}

// List handles listing learning records
// GET /records
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		middleware.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	// Parse query parameters for filtering
	filter := &record.RecordFilter{}

	if goalID := r.URL.Query().Get("goal_id"); goalID != "" {
		filter.GoalID = &goalID
	}
	if milestoneID := r.URL.Query().Get("milestone_id"); milestoneID != "" {
		filter.MilestoneID = &milestoneID
	}
	if formatStr := r.URL.Query().Get("format"); formatStr != "" {
		format := record.RecordFormat(formatStr)
		if format.IsValid() {
			filter.Format = &format
		}
	}
	if query := r.URL.Query().Get("q"); query != "" {
		filter.Query = &query
	}

	records, err := h.service.List(r.Context(), userID, filter)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	middleware.JSON(w, r, http.StatusOK, records)
}

// GetByID handles getting a learning record by ID
// GET /records/{recordId}
func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		middleware.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	recordID, ok := middleware.RequireURLParam(w, r, "recordId")
	if !ok {
		return
	}

	rec, err := h.service.GetByID(r.Context(), userID, recordID)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	middleware.JSON(w, r, http.StatusOK, rec)
}

// Create handles creating a new learning record
// POST /records
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		middleware.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	var input record.CreateRecordInput
	if !middleware.DecodeJSONBody(w, r, &input) {
		return
	}

	rec, err := h.service.Create(r.Context(), userID, &input)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	middleware.JSON(w, r, http.StatusCreated, rec)
}

// Update handles updating a learning record
// PUT /records/{recordId}
func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		middleware.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	recordID, ok := middleware.RequireURLParam(w, r, "recordId")
	if !ok {
		return
	}

	var input record.UpdateRecordInput
	if !middleware.DecodeJSONBody(w, r, &input) {
		return
	}

	rec, err := h.service.Update(r.Context(), userID, recordID, &input)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	middleware.JSON(w, r, http.StatusOK, rec)
}

// Delete handles deleting a learning record
// DELETE /records/{recordId}
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		middleware.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	recordID, ok := middleware.RequireURLParam(w, r, "recordId")
	if !ok {
		return
	}

	if err := h.service.Delete(r.Context(), userID, recordID); err != nil {
		h.handleError(w, r, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// SemanticSearch handles semantic search on learning records
// POST /records/search/semantic
func (h *Handler) SemanticSearch(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		middleware.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	var input record.SemanticSearchInput
	if !middleware.DecodeJSONBody(w, r, &input) {
		return
	}

	results, err := h.service.SemanticSearch(r.Context(), userID, &input)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	middleware.JSON(w, r, http.StatusOK, results)
}

// handleError handles service errors and returns appropriate HTTP responses
func (h *Handler) handleError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, service.ErrRecordNotFound):
		middleware.Error(w, r, http.StatusNotFound, "RECORD_NOT_FOUND", "Learning record not found")
	case errors.Is(err, service.ErrUnauthorized):
		middleware.Error(w, r, http.StatusForbidden, "FORBIDDEN", "Not authorized to access this record")
	case errors.Is(err, service.ErrTitleRequired):
		middleware.ValidationError(w, r, []middleware.ErrorDetail{{Field: "title", Message: "Title is required"}})
	case errors.Is(err, service.ErrContentRequired):
		middleware.ValidationError(w, r, []middleware.ErrorDetail{{Field: "content", Message: "Content is required"}})
	case errors.Is(err, service.ErrFormatRequired):
		middleware.ValidationError(w, r, []middleware.ErrorDetail{{Field: "format", Message: "Format is required"}})
	case errors.Is(err, service.ErrInvalidFormat):
		middleware.ValidationError(w, r, []middleware.ErrorDetail{{Field: "format", Message: "Format must be markdown or drawio"}})
	case errors.Is(err, service.ErrQueryRequired):
		middleware.ValidationError(w, r, []middleware.ErrorDetail{{Field: "query", Message: "Query is required for semantic search"}})
	// Database schema errors
	case sharedErrors.IsDatabaseSchema(err):
		log.Error().Err(err).Str("request_id", middleware.GetRequestID(r.Context())).Msg("Database schema error in record-service")
		middleware.Error(w, r, http.StatusInternalServerError, "DB_SCHEMA_ERROR", err.Error())
	default:
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "An internal error occurred")
	}
}
