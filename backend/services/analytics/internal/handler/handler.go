package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/kensan/backend/services/analytics/internal"
	"github.com/kensan/backend/services/analytics/internal/service"
	"github.com/kensan/backend/shared/middleware"
)

// Handler handles HTTP requests for analytics
type Handler struct {
	service *service.Service
}

// NewHandler creates a new analytics handler
func NewHandler(service *service.Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registers the analytics routes
func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Route("/analytics", func(r chi.Router) {
		r.Get("/summary/weekly", h.GetWeeklySummary)
		r.Get("/summary/monthly", h.GetMonthlySummary)
		r.Get("/trends", h.GetTrends)
		r.Get("/goal-progress", h.GetGoalProgress)
	})
}

// GetWeeklySummary handles GET /analytics/summary/weekly
func (h *Handler) GetWeeklySummary(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	filter := analytics.WeeklySummaryFilter{
		WeekStart: r.URL.Query().Get("week_start"),
	}

	summary, err := h.service.GetWeeklySummary(r.Context(), userID, filter)
	if err != nil {
		if errors.Is(err, service.ErrInvalidWeekStart) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_WEEK_START", "Invalid week_start format. Use YYYY-MM-DD")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get weekly summary")
		return
	}

	middleware.JSON(w, r, http.StatusOK, summary)
}

// GetMonthlySummary handles GET /analytics/summary/monthly
func (h *Handler) GetMonthlySummary(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	filter := analytics.MonthlySummaryFilter{}

	// Parse year
	if yearStr := r.URL.Query().Get("year"); yearStr != "" {
		year, err := strconv.Atoi(yearStr)
		if err != nil {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_YEAR", "Invalid year format")
			return
		}
		filter.Year = year
	}

	// Parse month
	if monthStr := r.URL.Query().Get("month"); monthStr != "" {
		month, err := strconv.Atoi(monthStr)
		if err != nil {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_MONTH", "Invalid month format")
			return
		}
		filter.Month = month
	}

	summary, err := h.service.GetMonthlySummary(r.Context(), userID, filter)
	if err != nil {
		if errors.Is(err, service.ErrInvalidMonth) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_MONTH", "Month must be between 1 and 12")
			return
		}
		if errors.Is(err, service.ErrInvalidYear) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_YEAR", "Invalid year value")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get monthly summary")
		return
	}

	middleware.JSON(w, r, http.StatusOK, summary)
}

// GetTrends handles GET /analytics/trends
func (h *Handler) GetTrends(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	filter := analytics.TrendFilter{
		Period: analytics.TrendPeriod(r.URL.Query().Get("period")),
	}

	// Parse count
	if countStr := r.URL.Query().Get("count"); countStr != "" {
		count, err := strconv.Atoi(countStr)
		if err != nil {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_COUNT", "Invalid count format")
			return
		}
		filter.Count = count
	}

	trends, err := h.service.GetTrends(r.Context(), userID, filter)
	if err != nil {
		if errors.Is(err, service.ErrInvalidPeriod) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_PERIOD", "Period must be 'week', 'month', or 'quarter'")
			return
		}
		if errors.Is(err, service.ErrInvalidCount) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_COUNT", "Count must be a positive integer")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get trends")
		return
	}

	middleware.JSON(w, r, http.StatusOK, trends)
}

// GetGoalProgress handles GET /analytics/goal-progress
func (h *Handler) GetGoalProgress(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	filter := analytics.GoalProgressFilter{}

	// Parse goal_tag
	if goalTagStr := r.URL.Query().Get("goal_tag"); goalTagStr != "" {
		gt := analytics.GoalTag(goalTagStr)
		filter.GoalTag = &gt
	}

	progress, err := h.service.GetGoalProgress(r.Context(), userID, filter)
	if err != nil {
		if errors.Is(err, service.ErrInvalidGoalTag) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_GOAL_TAG", "Invalid goal_tag value. Must be 'GK', 'OSS', 'Output', or 'Other'")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get goal progress")
		return
	}

	middleware.JSON(w, r, http.StatusOK, progress)
}
