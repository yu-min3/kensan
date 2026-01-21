package handler

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/kensan/backend/services/ai/internal"
	"github.com/kensan/backend/services/ai/internal/service"
	"github.com/kensan/backend/shared/middleware"
)

// Handler handles HTTP requests for AI operations
type Handler struct {
	service *service.Service
}

// NewHandler creates a new AI handler
func NewHandler(service *service.Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registers the AI routes
func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Route("/ai", func(r chi.Router) {
		r.Route("/reviews", func(r chi.Router) {
			r.Post("/generate", h.GenerateReview)
			r.Get("/", h.ListReviews)
			r.Get("/{reviewId}", h.GetReview)
		})
		r.Post("/ask", h.Ask)
	})
}

// GenerateReview handles POST /ai/reviews/generate
func (h *Handler) GenerateReview(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var input ai.GenerateReviewInput
	if !middleware.DecodeJSONBody(w, r, &input) {
		return
	}

	// Validation
	var validationErrors []middleware.ErrorDetail
	if input.WeekStart == "" {
		validationErrors = append(validationErrors, middleware.ErrorDetail{
			Field: "weekStart", Message: "Week start date is required",
		})
	}
	if input.WeekEnd == "" {
		validationErrors = append(validationErrors, middleware.ErrorDetail{
			Field: "weekEnd", Message: "Week end date is required",
		})
	}
	if len(validationErrors) > 0 {
		middleware.ValidationError(w, r, validationErrors)
		return
	}

	report, err := h.service.GenerateReview(r.Context(), userID, input)
	if err != nil {
		if errors.Is(err, service.ErrNoDataForPeriod) {
			middleware.Error(w, r, http.StatusBadRequest, "NO_DATA", "No time entries or learning records found for the specified period")
			return
		}
		if errors.Is(err, service.ErrClaudeAPIFailed) {
			middleware.Error(w, r, http.StatusServiceUnavailable, "AI_SERVICE_ERROR", "AI service temporarily unavailable")
			return
		}
		if errors.Is(err, service.ErrParseResponse) {
			middleware.Error(w, r, http.StatusInternalServerError, "PARSE_ERROR", "Failed to parse AI response")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to generate review")
		return
	}

	middleware.JSON(w, r, http.StatusCreated, report)
}

// ListReviews handles GET /ai/reviews
func (h *Handler) ListReviews(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	filter := ai.ReviewFilter{}

	// Parse query parameters
	if startDate := r.URL.Query().Get("start_date"); startDate != "" {
		filter.StartDate = &startDate
	}
	if endDate := r.URL.Query().Get("end_date"); endDate != "" {
		filter.EndDate = &endDate
	}

	reports, err := h.service.ListReviews(r.Context(), userID, filter)
	if err != nil {
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list reviews")
		return
	}

	middleware.JSON(w, r, http.StatusOK, reports)
}

// GetReview handles GET /ai/reviews/{reviewId}
func (h *Handler) GetReview(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	reviewID := chi.URLParam(r, "reviewId")

	report, err := h.service.GetReview(r.Context(), userID, reviewID)
	if err != nil {
		if errors.Is(err, service.ErrReportNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "REPORT_NOT_FOUND", "Review report not found")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get review")
		return
	}

	middleware.JSON(w, r, http.StatusOK, report)
}

// Ask handles POST /ai/ask
func (h *Handler) Ask(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var input ai.AskInput
	if !middleware.DecodeJSONBody(w, r, &input) {
		return
	}

	// Validation
	if input.Question == "" {
		middleware.ValidationError(w, r, []middleware.ErrorDetail{
			{Field: "question", Message: "Question is required"},
		})
		return
	}

	response, err := h.service.Ask(r.Context(), userID, input)
	if err != nil {
		if errors.Is(err, service.ErrClaudeAPIFailed) {
			middleware.Error(w, r, http.StatusServiceUnavailable, "AI_SERVICE_ERROR", "AI service temporarily unavailable")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to process question")
		return
	}

	middleware.JSON(w, r, http.StatusOK, response)
}
