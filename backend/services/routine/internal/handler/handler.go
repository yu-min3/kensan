package handler

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/kensan/backend/services/routine/internal"
	"github.com/kensan/backend/services/routine/internal/service"
	sharedErrors "github.com/kensan/backend/shared/errors"
	"github.com/kensan/backend/shared/middleware"
	"log/slog"
)

// Handler handles HTTP requests for routine tasks
type Handler struct {
	service *service.Service
}

// NewHandler creates a new routine handler
func NewHandler(service *service.Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registers the routine routes
func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Route("/routines", func(r chi.Router) {
		r.Get("/", h.ListRoutines)
		r.Post("/", h.CreateRoutine)
		r.Put("/{routineId}", h.UpdateRoutine)
		r.Patch("/{routineId}/toggle", h.ToggleRoutineEnabled)
		r.Delete("/{routineId}", h.DeleteRoutine)
	})
}

// ListRoutines handles GET /routines
func (h *Handler) ListRoutines(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	filter := routine.RoutineFilter{}

	// Parse enabled filter
	if enabled := r.URL.Query().Get("enabled"); enabled != "" {
		if b, err := strconv.ParseBool(enabled); err == nil {
			filter.Enabled = &b
		}
	}

	// Parse for_date filter (format: YYYY-MM-DD)
	if forDate := r.URL.Query().Get("for_date"); forDate != "" {
		if t, err := time.Parse("2006-01-02", forDate); err == nil {
			filter.ForDate = &t
		}
	}

	routines, err := h.service.ListRoutines(r.Context(), userID, filter)
	if err != nil {
		// Database schema errors
		if sharedErrors.IsDatabaseSchema(err) {
			slog.ErrorContext(r.Context(), "Database schema error in routine-service", "error", err, "request_id", middleware.GetRequestID(r.Context()))
			middleware.Error(w, r, http.StatusInternalServerError, "DB_SCHEMA_ERROR", err.Error())
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list routine tasks")
		return
	}

	middleware.JSON(w, r, http.StatusOK, routines)
}

// CreateRoutine handles POST /routines
func (h *Handler) CreateRoutine(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var input routine.CreateRoutineInput
	if !middleware.DecodeJSONBody(w, r, &input) {
		return
	}

	// Validation
	var validationErrors []middleware.ErrorDetail
	if input.Name == "" {
		validationErrors = append(validationErrors, middleware.ErrorDetail{
			Field: "name", Message: "Name is required",
		})
	}
	if !input.Frequency.IsValid() {
		validationErrors = append(validationErrors, middleware.ErrorDetail{
			Field: "frequency", Message: "Frequency must be one of: daily, weekly, monthly, custom",
		})
	}
	if len(validationErrors) > 0 {
		middleware.ValidationError(w, r, validationErrors)
		return
	}

	rt, err := h.service.CreateRoutine(r.Context(), userID, input)
	if err != nil {
		if errors.Is(err, service.ErrInvalidFrequency) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_FREQUENCY", "Invalid frequency value")
			return
		}
		if errors.Is(err, service.ErrInvalidInput) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_INPUT", "Invalid input")
			return
		}
		// Database schema errors
		if sharedErrors.IsDatabaseSchema(err) {
			slog.ErrorContext(r.Context(), "Database schema error in routine-service", "error", err, "request_id", middleware.GetRequestID(r.Context()))
			middleware.Error(w, r, http.StatusInternalServerError, "DB_SCHEMA_ERROR", err.Error())
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create routine task")
		return
	}

	middleware.JSON(w, r, http.StatusCreated, rt)
}

// UpdateRoutine handles PUT /routines/{routineId}
func (h *Handler) UpdateRoutine(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	routineID := chi.URLParam(r, "routineId")

	var input routine.UpdateRoutineInput
	if !middleware.DecodeJSONBody(w, r, &input) {
		return
	}

	rt, err := h.service.UpdateRoutine(r.Context(), userID, routineID, input)
	if err != nil {
		if errors.Is(err, service.ErrRoutineNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "ROUTINE_NOT_FOUND", "Routine task not found")
			return
		}
		if errors.Is(err, service.ErrInvalidFrequency) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_FREQUENCY", "Invalid frequency value")
			return
		}
		if errors.Is(err, service.ErrInvalidInput) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_INPUT", "Invalid input")
			return
		}
		// Database schema errors
		if sharedErrors.IsDatabaseSchema(err) {
			slog.ErrorContext(r.Context(), "Database schema error in routine-service", "error", err, "request_id", middleware.GetRequestID(r.Context()))
			middleware.Error(w, r, http.StatusInternalServerError, "DB_SCHEMA_ERROR", err.Error())
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update routine task")
		return
	}

	middleware.JSON(w, r, http.StatusOK, rt)
}

// ToggleRoutineEnabled handles PATCH /routines/{routineId}/toggle
func (h *Handler) ToggleRoutineEnabled(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	routineID := chi.URLParam(r, "routineId")

	rt, err := h.service.ToggleRoutineEnabled(r.Context(), userID, routineID)
	if err != nil {
		if errors.Is(err, service.ErrRoutineNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "ROUTINE_NOT_FOUND", "Routine task not found")
			return
		}
		// Database schema errors
		if sharedErrors.IsDatabaseSchema(err) {
			slog.ErrorContext(r.Context(), "Database schema error in routine-service", "error", err, "request_id", middleware.GetRequestID(r.Context()))
			middleware.Error(w, r, http.StatusInternalServerError, "DB_SCHEMA_ERROR", err.Error())
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to toggle routine enabled")
		return
	}

	middleware.JSON(w, r, http.StatusOK, rt)
}

// DeleteRoutine handles DELETE /routines/{routineId}
func (h *Handler) DeleteRoutine(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	routineID := chi.URLParam(r, "routineId")

	err := h.service.DeleteRoutine(r.Context(), userID, routineID)
	if err != nil {
		if errors.Is(err, service.ErrRoutineNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "ROUTINE_NOT_FOUND", "Routine task not found")
			return
		}
		// Database schema errors
		if sharedErrors.IsDatabaseSchema(err) {
			slog.ErrorContext(r.Context(), "Database schema error in routine-service", "error", err, "request_id", middleware.GetRequestID(r.Context()))
			middleware.Error(w, r, http.StatusInternalServerError, "DB_SCHEMA_ERROR", err.Error())
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete routine task")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
