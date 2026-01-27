package handler

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/kensan/backend/services/timeblock/internal"
	"github.com/kensan/backend/services/timeblock/internal/service"
	"github.com/kensan/backend/shared/middleware"
	"github.com/rs/zerolog/log"
)

// Handler handles HTTP requests for time blocks and time entries
type Handler struct {
	service service.FullService
}

// NewHandler creates a new timeblock handler
func NewHandler(svc service.FullService) *Handler {
	return &Handler{service: svc}
}

// RegisterRoutes registers the timeblock routes
func (h *Handler) RegisterRoutes(r chi.Router) {
	// TimeBlock routes
	r.Route("/timeblocks", func(r chi.Router) {
		r.Get("/", h.ListTimeBlocks)
		r.Post("/", h.CreateTimeBlock)
		r.Post("/generate-from-routines", h.GenerateFromRoutines)
		r.Put("/{timeBlockId}", h.UpdateTimeBlock)
		r.Delete("/{timeBlockId}", h.DeleteTimeBlock)
	})

	// TimeEntry routes
	r.Route("/time-entries", func(r chi.Router) {
		r.Get("/", h.ListTimeEntries)
		r.Post("/", h.CreateTimeEntry)
		r.Put("/{entryId}", h.UpdateTimeEntry)
		r.Delete("/{entryId}", h.DeleteTimeEntry)
	})

	// Timer routes
	r.Route("/timer", func(r chi.Router) {
		r.Get("/current", h.GetCurrentTimer)
		r.Post("/start", h.StartTimer)
		r.Post("/stop", h.StopTimer)
	})
}

// ========== TimeBlock Handlers ==========

// ListTimeBlocks handles GET /timeblocks
func (h *Handler) ListTimeBlocks(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	filter := timeblock.TimeBlockFilter{}

	// Parse UTC timestamp filters (take precedence)
	if startTs := r.URL.Query().Get("start_timestamp"); startTs != "" {
		filter.StartTimestamp = &startTs
	}
	if endTs := r.URL.Query().Get("end_timestamp"); endTs != "" {
		filter.EndTimestamp = &endTs
	}

	// Parse date filter (exact match) - only used if no timestamp filters
	if date := r.URL.Query().Get("date"); date != "" {
		filter.Date = &date
	}

	// Parse start_date filter (range)
	if startDate := r.URL.Query().Get("start_date"); startDate != "" {
		filter.StartDate = &startDate
	}

	// Parse end_date filter (range)
	if endDate := r.URL.Query().Get("end_date"); endDate != "" {
		filter.EndDate = &endDate
	}

	// Parse timezone parameter for response conversion
	timezone := r.URL.Query().Get("timezone")

	blocks, err := h.service.ListTimeBlocks(r.Context(), userID, filter, timezone)
	if err != nil {
		if errors.Is(err, service.ErrInvalidDate) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_DATE", "Invalid date format (expected YYYY-MM-DD)")
			return
		}
		log.Error().Err(err).Str("request_id", middleware.GetRequestID(r.Context())).Msg("Failed to list time blocks")
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list time blocks")
		return
	}

	middleware.JSON(w, r, http.StatusOK, blocks)
}

// CreateTimeBlock handles POST /timeblocks
func (h *Handler) CreateTimeBlock(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var input timeblock.CreateTimeBlockInput
	if !middleware.DecodeJSONBody(w, r, &input) {
		return
	}

	// Validation
	var validationErrors []middleware.ErrorDetail
	if input.TaskName == "" {
		validationErrors = append(validationErrors, middleware.ErrorDetail{
			Field: "taskName", Message: "Task name is required",
		})
	}
	if input.Date == "" {
		validationErrors = append(validationErrors, middleware.ErrorDetail{
			Field: "date", Message: "Date is required",
		})
	}
	if input.StartTime == "" {
		validationErrors = append(validationErrors, middleware.ErrorDetail{
			Field: "startTime", Message: "Start time is required",
		})
	}
	if input.EndTime == "" {
		validationErrors = append(validationErrors, middleware.ErrorDetail{
			Field: "endTime", Message: "End time is required",
		})
	}
	if len(validationErrors) > 0 {
		middleware.ValidationError(w, r, validationErrors)
		return
	}

	tb, err := h.service.CreateTimeBlock(r.Context(), userID, input)
	if err != nil {
		if errors.Is(err, service.ErrInvalidDate) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_DATE", "Invalid date format (expected YYYY-MM-DD)")
			return
		}
		if errors.Is(err, service.ErrInvalidTime) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_TIME", "Invalid time format (expected HH:mm)")
			return
		}
		if errors.Is(err, service.ErrInvalidInput) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_INPUT", "Invalid input")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create time block")
		return
	}

	middleware.JSON(w, r, http.StatusCreated, tb)
}

// UpdateTimeBlock handles PUT /timeblocks/{timeBlockId}
func (h *Handler) UpdateTimeBlock(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	timeBlockID := chi.URLParam(r, "timeBlockId")

	var input timeblock.UpdateTimeBlockInput
	if !middleware.DecodeJSONBody(w, r, &input) {
		return
	}

	tb, err := h.service.UpdateTimeBlock(r.Context(), userID, timeBlockID, input)
	if err != nil {
		if errors.Is(err, service.ErrTimeBlockNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "TIME_BLOCK_NOT_FOUND", "Time block not found")
			return
		}
		if errors.Is(err, service.ErrInvalidDate) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_DATE", "Invalid date format (expected YYYY-MM-DD)")
			return
		}
		if errors.Is(err, service.ErrInvalidTime) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_TIME", "Invalid time format (expected HH:mm)")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update time block")
		return
	}

	middleware.JSON(w, r, http.StatusOK, tb)
}

// DeleteTimeBlock handles DELETE /timeblocks/{timeBlockId}
func (h *Handler) DeleteTimeBlock(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	timeBlockID := chi.URLParam(r, "timeBlockId")

	err := h.service.DeleteTimeBlock(r.Context(), userID, timeBlockID)
	if err != nil {
		if errors.Is(err, service.ErrTimeBlockNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "TIME_BLOCK_NOT_FOUND", "Time block not found")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete time block")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// GenerateFromRoutines handles POST /timeblocks/generate-from-routines
func (h *Handler) GenerateFromRoutines(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var input timeblock.GenerateFromRoutinesInput
	if !middleware.DecodeJSONBody(w, r, &input) {
		return
	}

	if input.Date == "" {
		middleware.ValidationError(w, r, []middleware.ErrorDetail{
			{Field: "date", Message: "Date is required"},
		})
		return
	}

	result, err := h.service.GenerateFromRoutines(r.Context(), userID, input)
	if err != nil {
		if errors.Is(err, service.ErrInvalidDate) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_DATE", "Invalid date format (expected YYYY-MM-DD)")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to generate time blocks from routines")
		return
	}

	middleware.JSON(w, r, http.StatusCreated, result)
}

// ========== TimeEntry Handlers ==========

// ListTimeEntries handles GET /time-entries
func (h *Handler) ListTimeEntries(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	filter := timeblock.TimeEntryFilter{}

	// Parse UTC timestamp filters (take precedence)
	if startTs := r.URL.Query().Get("start_timestamp"); startTs != "" {
		filter.StartTimestamp = &startTs
	}
	if endTs := r.URL.Query().Get("end_timestamp"); endTs != "" {
		filter.EndTimestamp = &endTs
	}

	// Parse date filter (exact match) - only used if no timestamp filters
	if date := r.URL.Query().Get("date"); date != "" {
		filter.Date = &date
	}

	// Parse start_date filter (range)
	if startDate := r.URL.Query().Get("start_date"); startDate != "" {
		filter.StartDate = &startDate
	}

	// Parse end_date filter (range)
	if endDate := r.URL.Query().Get("end_date"); endDate != "" {
		filter.EndDate = &endDate
	}

	// Parse timezone parameter for response conversion
	timezone := r.URL.Query().Get("timezone")

	entries, err := h.service.ListTimeEntries(r.Context(), userID, filter, timezone)
	if err != nil {
		if errors.Is(err, service.ErrInvalidDate) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_DATE", "Invalid date format (expected YYYY-MM-DD)")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list time entries")
		return
	}

	middleware.JSON(w, r, http.StatusOK, entries)
}

// CreateTimeEntry handles POST /time-entries
func (h *Handler) CreateTimeEntry(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var input timeblock.CreateTimeEntryInput
	if !middleware.DecodeJSONBody(w, r, &input) {
		return
	}

	// Validation
	var validationErrors []middleware.ErrorDetail
	if input.TaskName == "" {
		validationErrors = append(validationErrors, middleware.ErrorDetail{
			Field: "taskName", Message: "Task name is required",
		})
	}
	if input.Date == "" {
		validationErrors = append(validationErrors, middleware.ErrorDetail{
			Field: "date", Message: "Date is required",
		})
	}
	if input.StartTime == "" {
		validationErrors = append(validationErrors, middleware.ErrorDetail{
			Field: "startTime", Message: "Start time is required",
		})
	}
	if input.EndTime == "" {
		validationErrors = append(validationErrors, middleware.ErrorDetail{
			Field: "endTime", Message: "End time is required",
		})
	}
	if len(validationErrors) > 0 {
		middleware.ValidationError(w, r, validationErrors)
		return
	}

	te, err := h.service.CreateTimeEntry(r.Context(), userID, input)
	if err != nil {
		if errors.Is(err, service.ErrInvalidDate) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_DATE", "Invalid date format (expected YYYY-MM-DD)")
			return
		}
		if errors.Is(err, service.ErrInvalidTime) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_TIME", "Invalid time format (expected HH:mm)")
			return
		}
		if errors.Is(err, service.ErrInvalidInput) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_INPUT", "Invalid input")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create time entry")
		return
	}

	middleware.JSON(w, r, http.StatusCreated, te)
}

// UpdateTimeEntry handles PUT /time-entries/{entryId}
func (h *Handler) UpdateTimeEntry(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	entryID := chi.URLParam(r, "entryId")

	var input timeblock.UpdateTimeEntryInput
	if !middleware.DecodeJSONBody(w, r, &input) {
		return
	}

	te, err := h.service.UpdateTimeEntry(r.Context(), userID, entryID, input)
	if err != nil {
		if errors.Is(err, service.ErrTimeEntryNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "TIME_ENTRY_NOT_FOUND", "Time entry not found")
			return
		}
		if errors.Is(err, service.ErrInvalidDate) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_DATE", "Invalid date format (expected YYYY-MM-DD)")
			return
		}
		if errors.Is(err, service.ErrInvalidTime) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_TIME", "Invalid time format (expected HH:mm)")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update time entry")
		return
	}

	middleware.JSON(w, r, http.StatusOK, te)
}

// DeleteTimeEntry handles DELETE /time-entries/{entryId}
func (h *Handler) DeleteTimeEntry(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	entryID := chi.URLParam(r, "entryId")

	err := h.service.DeleteTimeEntry(r.Context(), userID, entryID)
	if err != nil {
		if errors.Is(err, service.ErrTimeEntryNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "TIME_ENTRY_NOT_FOUND", "Time entry not found")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete time entry")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ========== Timer Handlers ==========

// GetCurrentTimer handles GET /timer/current
func (h *Handler) GetCurrentTimer(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	timer, err := h.service.GetRunningTimer(r.Context(), userID)
	if err != nil {
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get running timer")
		return
	}

	middleware.JSON(w, r, http.StatusOK, timer)
}

// StartTimer handles POST /timer/start
func (h *Handler) StartTimer(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var input timeblock.StartTimerInput
	if !middleware.DecodeJSONBody(w, r, &input) {
		return
	}

	// Validation
	var validationErrors []middleware.ErrorDetail
	if input.TaskName == "" {
		validationErrors = append(validationErrors, middleware.ErrorDetail{
			Field: "taskName", Message: "Task name is required",
		})
	}
	if len(validationErrors) > 0 {
		middleware.ValidationError(w, r, validationErrors)
		return
	}

	timer, err := h.service.StartTimer(r.Context(), userID, input)
	if err != nil {
		if errors.Is(err, service.ErrTimerAlreadyRunning) {
			middleware.Error(w, r, http.StatusConflict, "TIMER_ALREADY_RUNNING", "A timer is already running. Stop it first before starting a new one.")
			return
		}
		if errors.Is(err, service.ErrInvalidInput) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_INPUT", "Invalid input")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to start timer")
		return
	}

	middleware.JSON(w, r, http.StatusCreated, timer)
}

// StopTimer handles POST /timer/stop
func (h *Handler) StopTimer(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	result, err := h.service.StopTimer(r.Context(), userID)
	if err != nil {
		if errors.Is(err, service.ErrRunningTimerNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "NO_RUNNING_TIMER", "No running timer to stop")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to stop timer")
		return
	}

	middleware.JSON(w, r, http.StatusOK, result)
}
