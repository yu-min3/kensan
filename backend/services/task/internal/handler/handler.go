package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/kensan/backend/services/task/internal"
	"github.com/kensan/backend/services/task/internal/service"
	"github.com/kensan/backend/shared/middleware"
)

// Handler handles HTTP requests for tasks, goals, milestones, and tags
type Handler struct {
	service *service.Service
}

// NewHandler creates a new task handler
func NewHandler(service *service.Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registers the task routes
func (h *Handler) RegisterRoutes(r chi.Router) {
	// Goal routes
	r.Route("/goals", func(r chi.Router) {
		r.Get("/", h.ListGoals)
		r.Post("/", h.CreateGoal)
		r.Get("/{goalId}", h.GetGoal)
		r.Put("/{goalId}", h.UpdateGoal)
		r.Delete("/{goalId}", h.DeleteGoal)
	})

	// Milestone routes
	r.Route("/milestones", func(r chi.Router) {
		r.Get("/", h.ListMilestones)
		r.Post("/", h.CreateMilestone)
		r.Get("/{milestoneId}", h.GetMilestone)
		r.Put("/{milestoneId}", h.UpdateMilestone)
		r.Delete("/{milestoneId}", h.DeleteMilestone)
	})

	// Tag routes
	r.Route("/tags", func(r chi.Router) {
		r.Get("/", h.ListTags)
		r.Post("/", h.CreateTag)
		r.Get("/{tagId}", h.GetTag)
		r.Put("/{tagId}", h.UpdateTag)
		r.Delete("/{tagId}", h.DeleteTag)
	})

	// Task routes
	r.Route("/tasks", func(r chi.Router) {
		r.Get("/", h.ListTasks)
		r.Post("/", h.CreateTask)
		r.Get("/{taskId}", h.GetTask)
		r.Put("/{taskId}", h.UpdateTask)
		r.Patch("/{taskId}/complete", h.ToggleTaskComplete)
		r.Delete("/{taskId}", h.DeleteTask)
	})
}

// ========== Task Handlers ==========

// ListTasks handles GET /tasks
func (h *Handler) ListTasks(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	filter := task.TaskFilter{}

	// Parse milestone_id filter
	if milestoneID := r.URL.Query().Get("milestone_id"); milestoneID != "" {
		filter.MilestoneID = &milestoneID
	}

	// Parse completed filter
	if completed := r.URL.Query().Get("completed"); completed != "" {
		if b, err := strconv.ParseBool(completed); err == nil {
			filter.Completed = &b
		}
	}

	// Parse parent_id filter
	if parentID := r.URL.Query().Get("parent_id"); parentID != "" {
		filter.ParentTaskID = &parentID
	}

	tasks, err := h.service.ListTasks(r.Context(), userID, filter)
	if err != nil {
		if errors.Is(err, service.ErrMilestoneNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "MILESTONE_NOT_FOUND", "Milestone not found")
			return
		}
		if errors.Is(err, service.ErrTaskNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "TASK_NOT_FOUND", "Parent task not found")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list tasks")
		return
	}

	middleware.JSON(w, r, http.StatusOK, tasks)
}

// GetTask handles GET /tasks/{taskId}
func (h *Handler) GetTask(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	taskID := chi.URLParam(r, "taskId")

	t, err := h.service.GetTask(r.Context(), userID, taskID)
	if err != nil {
		if errors.Is(err, service.ErrTaskNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "TASK_NOT_FOUND", "Task not found")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get task")
		return
	}

	middleware.JSON(w, r, http.StatusOK, t)
}

// CreateTask handles POST /tasks
func (h *Handler) CreateTask(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var input task.CreateTaskInput
	if !middleware.DecodeJSONBody(w, r, &input) {
		return
	}

	// Validation
	if input.Name == "" {
		middleware.ValidationError(w, r, []middleware.ErrorDetail{
			{Field: "name", Message: "Name is required"},
		})
		return
	}

	t, err := h.service.CreateTask(r.Context(), userID, input)
	if err != nil {
		if errors.Is(err, service.ErrMilestoneNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "MILESTONE_NOT_FOUND", "Milestone not found")
			return
		}
		if errors.Is(err, service.ErrTaskNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "TASK_NOT_FOUND", "Parent task not found")
			return
		}
		if errors.Is(err, service.ErrInvalidInput) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_INPUT", "Invalid input")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create task")
		return
	}

	middleware.JSON(w, r, http.StatusCreated, t)
}

// UpdateTask handles PUT /tasks/{taskId}
func (h *Handler) UpdateTask(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	taskID := chi.URLParam(r, "taskId")

	var input task.UpdateTaskInput
	if !middleware.DecodeJSONBody(w, r, &input) {
		return
	}

	t, err := h.service.UpdateTask(r.Context(), userID, taskID, input)
	if err != nil {
		if errors.Is(err, service.ErrTaskNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "TASK_NOT_FOUND", "Task not found")
			return
		}
		if errors.Is(err, service.ErrMilestoneNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "MILESTONE_NOT_FOUND", "Milestone not found")
			return
		}
		if errors.Is(err, service.ErrInvalidInput) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_INPUT", "Invalid input (e.g., circular reference)")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update task")
		return
	}

	middleware.JSON(w, r, http.StatusOK, t)
}

// ToggleTaskComplete handles PATCH /tasks/{taskId}/complete
func (h *Handler) ToggleTaskComplete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	taskID := chi.URLParam(r, "taskId")

	t, err := h.service.ToggleTaskComplete(r.Context(), userID, taskID)
	if err != nil {
		if errors.Is(err, service.ErrTaskNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "TASK_NOT_FOUND", "Task not found")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to toggle task complete")
		return
	}

	middleware.JSON(w, r, http.StatusOK, t)
}

// DeleteTask handles DELETE /tasks/{taskId}
func (h *Handler) DeleteTask(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	taskID := chi.URLParam(r, "taskId")

	err := h.service.DeleteTask(r.Context(), userID, taskID)
	if err != nil {
		if errors.Is(err, service.ErrTaskNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "TASK_NOT_FOUND", "Task not found")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete task")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ========== Goal Handlers ==========

// ListGoals handles GET /goals
func (h *Handler) ListGoals(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	filter := task.GoalFilter{}

	// Parse archived filter
	if archived := r.URL.Query().Get("archived"); archived != "" {
		if b, err := strconv.ParseBool(archived); err == nil {
			filter.IsArchived = &b
		}
	}

	goals, err := h.service.ListGoals(r.Context(), userID, filter)
	if err != nil {
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list goals")
		return
	}

	middleware.JSON(w, r, http.StatusOK, goals)
}

// GetGoal handles GET /goals/{goalId}
func (h *Handler) GetGoal(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	goalID := chi.URLParam(r, "goalId")

	goal, err := h.service.GetGoal(r.Context(), userID, goalID)
	if err != nil {
		if errors.Is(err, service.ErrGoalNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "GOAL_NOT_FOUND", "Goal not found")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get goal")
		return
	}

	middleware.JSON(w, r, http.StatusOK, goal)
}

// CreateGoal handles POST /goals
func (h *Handler) CreateGoal(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var input task.CreateGoalInput
	if !middleware.DecodeJSONBody(w, r, &input) {
		return
	}

	if input.Name == "" {
		middleware.ValidationError(w, r, []middleware.ErrorDetail{
			{Field: "name", Message: "Name is required"},
		})
		return
	}

	goal, err := h.service.CreateGoal(r.Context(), userID, input)
	if err != nil {
		if errors.Is(err, service.ErrInvalidInput) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_INPUT", "Invalid input")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create goal")
		return
	}

	middleware.JSON(w, r, http.StatusCreated, goal)
}

// UpdateGoal handles PUT /goals/{goalId}
func (h *Handler) UpdateGoal(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	goalID := chi.URLParam(r, "goalId")

	var input task.UpdateGoalInput
	if !middleware.DecodeJSONBody(w, r, &input) {
		return
	}

	goal, err := h.service.UpdateGoal(r.Context(), userID, goalID, input)
	if err != nil {
		if errors.Is(err, service.ErrGoalNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "GOAL_NOT_FOUND", "Goal not found")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update goal")
		return
	}

	middleware.JSON(w, r, http.StatusOK, goal)
}

// DeleteGoal handles DELETE /goals/{goalId}
func (h *Handler) DeleteGoal(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	goalID := chi.URLParam(r, "goalId")

	err := h.service.DeleteGoal(r.Context(), userID, goalID)
	if err != nil {
		if errors.Is(err, service.ErrGoalNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "GOAL_NOT_FOUND", "Goal not found")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete goal")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ========== Milestone Handlers ==========

// ListMilestones handles GET /milestones
func (h *Handler) ListMilestones(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	filter := task.MilestoneFilter{}

	// Parse goal_id filter
	if goalID := r.URL.Query().Get("goal_id"); goalID != "" {
		filter.GoalID = &goalID
	}

	// Parse status filter
	if status := r.URL.Query().Get("status"); status != "" {
		s := task.MilestoneStatus(status)
		filter.Status = &s
	}

	milestones, err := h.service.ListMilestones(r.Context(), userID, filter)
	if err != nil {
		if errors.Is(err, service.ErrGoalNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "GOAL_NOT_FOUND", "Goal not found")
			return
		}
		if errors.Is(err, service.ErrInvalidStatus) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_STATUS", "Invalid milestone status")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list milestones")
		return
	}

	middleware.JSON(w, r, http.StatusOK, milestones)
}

// GetMilestone handles GET /milestones/{milestoneId}
func (h *Handler) GetMilestone(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	milestoneID := chi.URLParam(r, "milestoneId")

	milestone, err := h.service.GetMilestone(r.Context(), userID, milestoneID)
	if err != nil {
		if errors.Is(err, service.ErrMilestoneNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "MILESTONE_NOT_FOUND", "Milestone not found")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get milestone")
		return
	}

	middleware.JSON(w, r, http.StatusOK, milestone)
}

// CreateMilestone handles POST /milestones
func (h *Handler) CreateMilestone(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var input task.CreateMilestoneInput
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
	if input.GoalID == "" {
		validationErrors = append(validationErrors, middleware.ErrorDetail{
			Field: "goalId", Message: "Goal ID is required",
		})
	}
	if len(validationErrors) > 0 {
		middleware.ValidationError(w, r, validationErrors)
		return
	}

	milestone, err := h.service.CreateMilestone(r.Context(), userID, input)
	if err != nil {
		if errors.Is(err, service.ErrGoalNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "GOAL_NOT_FOUND", "Goal not found")
			return
		}
		if errors.Is(err, service.ErrInvalidInput) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_INPUT", "Invalid input")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create milestone")
		return
	}

	middleware.JSON(w, r, http.StatusCreated, milestone)
}

// UpdateMilestone handles PUT /milestones/{milestoneId}
func (h *Handler) UpdateMilestone(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	milestoneID := chi.URLParam(r, "milestoneId")

	var input task.UpdateMilestoneInput
	if !middleware.DecodeJSONBody(w, r, &input) {
		return
	}

	milestone, err := h.service.UpdateMilestone(r.Context(), userID, milestoneID, input)
	if err != nil {
		if errors.Is(err, service.ErrMilestoneNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "MILESTONE_NOT_FOUND", "Milestone not found")
			return
		}
		if errors.Is(err, service.ErrGoalNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "GOAL_NOT_FOUND", "Goal not found")
			return
		}
		if errors.Is(err, service.ErrInvalidStatus) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_STATUS", "Invalid milestone status")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update milestone")
		return
	}

	middleware.JSON(w, r, http.StatusOK, milestone)
}

// DeleteMilestone handles DELETE /milestones/{milestoneId}
func (h *Handler) DeleteMilestone(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	milestoneID := chi.URLParam(r, "milestoneId")

	err := h.service.DeleteMilestone(r.Context(), userID, milestoneID)
	if err != nil {
		if errors.Is(err, service.ErrMilestoneNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "MILESTONE_NOT_FOUND", "Milestone not found")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete milestone")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ========== Tag Handlers ==========

// ListTags handles GET /tags
func (h *Handler) ListTags(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	tags, err := h.service.ListTags(r.Context(), userID)
	if err != nil {
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list tags")
		return
	}

	middleware.JSON(w, r, http.StatusOK, tags)
}

// GetTag handles GET /tags/{tagId}
func (h *Handler) GetTag(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	tagID := chi.URLParam(r, "tagId")

	tag, err := h.service.GetTag(r.Context(), userID, tagID)
	if err != nil {
		if errors.Is(err, service.ErrTagNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "TAG_NOT_FOUND", "Tag not found")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get tag")
		return
	}

	middleware.JSON(w, r, http.StatusOK, tag)
}

// CreateTag handles POST /tags
func (h *Handler) CreateTag(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var input task.CreateTagInput
	if !middleware.DecodeJSONBody(w, r, &input) {
		return
	}

	if input.Name == "" {
		middleware.ValidationError(w, r, []middleware.ErrorDetail{
			{Field: "name", Message: "Name is required"},
		})
		return
	}

	tag, err := h.service.CreateTag(r.Context(), userID, input)
	if err != nil {
		if errors.Is(err, service.ErrInvalidInput) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_INPUT", "Invalid input")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create tag")
		return
	}

	middleware.JSON(w, r, http.StatusCreated, tag)
}

// UpdateTag handles PUT /tags/{tagId}
func (h *Handler) UpdateTag(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	tagID := chi.URLParam(r, "tagId")

	var input task.UpdateTagInput
	if !middleware.DecodeJSONBody(w, r, &input) {
		return
	}

	tag, err := h.service.UpdateTag(r.Context(), userID, tagID, input)
	if err != nil {
		if errors.Is(err, service.ErrTagNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "TAG_NOT_FOUND", "Tag not found")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update tag")
		return
	}

	middleware.JSON(w, r, http.StatusOK, tag)
}

// DeleteTag handles DELETE /tags/{tagId}
func (h *Handler) DeleteTag(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	tagID := chi.URLParam(r, "tagId")

	err := h.service.DeleteTag(r.Context(), userID, tagID)
	if err != nil {
		if errors.Is(err, service.ErrTagNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "TAG_NOT_FOUND", "Tag not found")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete tag")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
