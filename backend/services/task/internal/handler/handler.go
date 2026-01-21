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

// Handler handles HTTP requests for projects and tasks
type Handler struct {
	service *service.Service
}

// NewHandler creates a new task handler
func NewHandler(service *service.Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registers the task routes
func (h *Handler) RegisterRoutes(r chi.Router) {
	// Project routes
	r.Route("/projects", func(r chi.Router) {
		r.Get("/", h.ListProjects)
		r.Post("/", h.CreateProject)
		r.Get("/{projectId}", h.GetProject)
		r.Put("/{projectId}", h.UpdateProject)
		r.Delete("/{projectId}", h.DeleteProject)
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

// ========== Project Handlers ==========

// ListProjects handles GET /projects
func (h *Handler) ListProjects(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	filter := task.ProjectFilter{}

	// Parse archived filter
	if archived := r.URL.Query().Get("archived"); archived != "" {
		if b, err := strconv.ParseBool(archived); err == nil {
			filter.IsArchived = &b
		}
	}

	// Parse goal_tag filter
	if goalTag := r.URL.Query().Get("goal_tag"); goalTag != "" {
		gt := task.GoalTag(goalTag)
		filter.GoalTag = &gt
	}

	projects, err := h.service.ListProjects(r.Context(), userID, filter)
	if err != nil {
		if errors.Is(err, service.ErrInvalidGoalTag) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_GOAL_TAG", "Invalid goal tag value")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list projects")
		return
	}

	middleware.JSON(w, r, http.StatusOK, projects)
}

// GetProject handles GET /projects/{projectId}
func (h *Handler) GetProject(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	projectID := chi.URLParam(r, "projectId")

	project, err := h.service.GetProject(r.Context(), userID, projectID)
	if err != nil {
		if errors.Is(err, service.ErrProjectNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "PROJECT_NOT_FOUND", "Project not found")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get project")
		return
	}

	middleware.JSON(w, r, http.StatusOK, project)
}

// CreateProject handles POST /projects
func (h *Handler) CreateProject(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var input task.CreateProjectInput
	if !middleware.DecodeJSONBody(w, r, &input) {
		return
	}

	if input.Name == "" {
		middleware.ValidationError(w, r, []middleware.ErrorDetail{
			{Field: "name", Message: "Name is required"},
		})
		return
	}

	project, err := h.service.CreateProject(r.Context(), userID, input)
	if err != nil {
		if errors.Is(err, service.ErrInvalidGoalTag) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_GOAL_TAG", "Invalid goal tag value")
			return
		}
		if errors.Is(err, service.ErrInvalidInput) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_INPUT", "Invalid input")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create project")
		return
	}

	middleware.JSON(w, r, http.StatusCreated, project)
}

// UpdateProject handles PUT /projects/{projectId}
func (h *Handler) UpdateProject(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	projectID := chi.URLParam(r, "projectId")

	var input task.UpdateProjectInput
	if !middleware.DecodeJSONBody(w, r, &input) {
		return
	}

	project, err := h.service.UpdateProject(r.Context(), userID, projectID, input)
	if err != nil {
		if errors.Is(err, service.ErrProjectNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "PROJECT_NOT_FOUND", "Project not found")
			return
		}
		if errors.Is(err, service.ErrInvalidGoalTag) {
			middleware.Error(w, r, http.StatusBadRequest, "INVALID_GOAL_TAG", "Invalid goal tag value")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update project")
		return
	}

	middleware.JSON(w, r, http.StatusOK, project)
}

// DeleteProject handles DELETE /projects/{projectId}
func (h *Handler) DeleteProject(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	projectID := chi.URLParam(r, "projectId")

	err := h.service.DeleteProject(r.Context(), userID, projectID)
	if err != nil {
		if errors.Is(err, service.ErrProjectNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "PROJECT_NOT_FOUND", "Project not found")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete project")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ========== Task Handlers ==========

// ListTasks handles GET /tasks
func (h *Handler) ListTasks(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	filter := task.TaskFilter{}

	// Parse project_id filter
	if projectID := r.URL.Query().Get("project_id"); projectID != "" {
		filter.ProjectID = &projectID
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
		if errors.Is(err, service.ErrProjectNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "PROJECT_NOT_FOUND", "Project not found")
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
	var validationErrors []middleware.ErrorDetail
	if input.Name == "" {
		validationErrors = append(validationErrors, middleware.ErrorDetail{
			Field: "name", Message: "Name is required",
		})
	}
	if input.ProjectID == "" {
		validationErrors = append(validationErrors, middleware.ErrorDetail{
			Field: "projectId", Message: "Project ID is required",
		})
	}
	if len(validationErrors) > 0 {
		middleware.ValidationError(w, r, validationErrors)
		return
	}

	t, err := h.service.CreateTask(r.Context(), userID, input)
	if err != nil {
		if errors.Is(err, service.ErrProjectNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "PROJECT_NOT_FOUND", "Project not found")
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
		if errors.Is(err, service.ErrProjectNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "PROJECT_NOT_FOUND", "Project not found")
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
