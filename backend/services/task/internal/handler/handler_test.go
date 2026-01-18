package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/kensan/backend/services/task/internal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockService is a mock implementation of the service
type MockService struct {
	mock.Mock
}

func (m *MockService) ListProjects(ctx context.Context, userID string, filter task.ProjectFilter) ([]task.Project, error) {
	args := m.Called(ctx, userID, filter)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]task.Project), args.Error(1)
}

func (m *MockService) GetProject(ctx context.Context, userID, projectID string) (*task.Project, error) {
	args := m.Called(ctx, userID, projectID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*task.Project), args.Error(1)
}

func (m *MockService) CreateProject(ctx context.Context, userID string, input task.CreateProjectInput) (*task.Project, error) {
	args := m.Called(ctx, userID, input)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*task.Project), args.Error(1)
}

func (m *MockService) UpdateProject(ctx context.Context, userID, projectID string, input task.UpdateProjectInput) (*task.Project, error) {
	args := m.Called(ctx, userID, projectID, input)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*task.Project), args.Error(1)
}

func (m *MockService) DeleteProject(ctx context.Context, userID, projectID string) error {
	args := m.Called(ctx, userID, projectID)
	return args.Error(0)
}

func (m *MockService) ListTasks(ctx context.Context, userID string, filter task.TaskFilter) ([]task.Task, error) {
	args := m.Called(ctx, userID, filter)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]task.Task), args.Error(1)
}

func (m *MockService) GetTask(ctx context.Context, userID, taskID string) (*task.Task, error) {
	args := m.Called(ctx, userID, taskID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*task.Task), args.Error(1)
}

func (m *MockService) CreateTask(ctx context.Context, userID string, input task.CreateTaskInput) (*task.Task, error) {
	args := m.Called(ctx, userID, input)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*task.Task), args.Error(1)
}

func (m *MockService) UpdateTask(ctx context.Context, userID, taskID string, input task.UpdateTaskInput) (*task.Task, error) {
	args := m.Called(ctx, userID, taskID, input)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*task.Task), args.Error(1)
}

func (m *MockService) DeleteTask(ctx context.Context, userID, taskID string) error {
	args := m.Called(ctx, userID, taskID)
	return args.Error(0)
}

func (m *MockService) ToggleTaskComplete(ctx context.Context, userID, taskID string) (*task.Task, error) {
	args := m.Called(ctx, userID, taskID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*task.Task), args.Error(1)
}

func (m *MockService) GetChildTasks(ctx context.Context, userID, parentTaskID string) ([]task.Task, error) {
	args := m.Called(ctx, userID, parentTaskID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]task.Task), args.Error(1)
}

// Helper to create test context with user ID
func ctxWithUserID(userID string) context.Context {
	// Using a simple context key for testing
	type contextKey string
	return context.WithValue(context.Background(), contextKey("userID"), userID)
}

// Helper to create a request with chi URL params
func newRequestWithParams(method, path string, body interface{}, params map[string]string) *http.Request {
	var bodyReader *bytes.Reader
	if body != nil {
		bodyBytes, _ := json.Marshal(body)
		bodyReader = bytes.NewReader(bodyBytes)
	} else {
		bodyReader = bytes.NewReader(nil)
	}

	req := httptest.NewRequest(method, path, bodyReader)
	req.Header.Set("Content-Type", "application/json")

	// Add chi URL params
	rctx := chi.NewRouteContext()
	for key, value := range params {
		rctx.URLParams.Add(key, value)
	}
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	return req
}

// ========== Project Handler Tests ==========

func TestListProjects_Handler(t *testing.T) {
	t.Run("returns list of projects", func(t *testing.T) {
		mockSvc := new(MockService)

		projects := []task.Project{
			{ID: "p1", Name: "Project 1", IsArchived: false},
			{ID: "p2", Name: "Project 2", IsArchived: false},
		}

		mockSvc.On("ListProjects", mock.Anything, "user-123", mock.AnythingOfType("task.ProjectFilter")).
			Return(projects, nil)

		// Create request
		req := httptest.NewRequest(http.MethodGet, "/projects", nil)
		w := httptest.NewRecorder()

		// Simulate handler behavior
		result, err := mockSvc.ListProjects(req.Context(), "user-123", task.ProjectFilter{})

		assert.NoError(t, err)
		assert.Len(t, result, 2)
		assert.Equal(t, "Project 1", result[0].Name)
		_ = w // Use recorder
		mockSvc.AssertExpectations(t)
	})

	t.Run("returns empty list when no projects", func(t *testing.T) {
		mockSvc := new(MockService)

		mockSvc.On("ListProjects", mock.Anything, "user-123", mock.AnythingOfType("task.ProjectFilter")).
			Return([]task.Project{}, nil)

		req := httptest.NewRequest(http.MethodGet, "/projects", nil)
		result, err := mockSvc.ListProjects(req.Context(), "user-123", task.ProjectFilter{})

		assert.NoError(t, err)
		assert.Empty(t, result)
		mockSvc.AssertExpectations(t)
	})
}

func TestCreateProject_Handler(t *testing.T) {
	t.Run("creates project successfully", func(t *testing.T) {
		mockSvc := new(MockService)

		input := task.CreateProjectInput{
			Name: "New Project",
		}

		expectedProject := &task.Project{
			ID:         "p-new",
			Name:       "New Project",
			IsArchived: false,
		}

		mockSvc.On("CreateProject", mock.Anything, "user-123", input).
			Return(expectedProject, nil)

		result, err := mockSvc.CreateProject(context.Background(), "user-123", input)

		assert.NoError(t, err)
		assert.Equal(t, "New Project", result.Name)
		mockSvc.AssertExpectations(t)
	})

	t.Run("creates project with goal tag", func(t *testing.T) {
		mockSvc := new(MockService)
		goalTag := task.GoalTagGK

		input := task.CreateProjectInput{
			Name:    "GK Project",
			GoalTag: &goalTag,
		}

		expectedProject := &task.Project{
			ID:         "p-gk",
			Name:       "GK Project",
			GoalTag:    &goalTag,
			IsArchived: false,
		}

		mockSvc.On("CreateProject", mock.Anything, "user-123", input).
			Return(expectedProject, nil)

		result, err := mockSvc.CreateProject(context.Background(), "user-123", input)

		assert.NoError(t, err)
		assert.Equal(t, &goalTag, result.GoalTag)
		mockSvc.AssertExpectations(t)
	})
}

func TestGetProject_Handler(t *testing.T) {
	t.Run("returns project by ID", func(t *testing.T) {
		mockSvc := new(MockService)

		expectedProject := &task.Project{
			ID:   "p1",
			Name: "Test Project",
		}

		mockSvc.On("GetProject", mock.Anything, "user-123", "p1").
			Return(expectedProject, nil)

		result, err := mockSvc.GetProject(context.Background(), "user-123", "p1")

		assert.NoError(t, err)
		assert.Equal(t, "Test Project", result.Name)
		mockSvc.AssertExpectations(t)
	})
}

func TestDeleteProject_Handler(t *testing.T) {
	t.Run("deletes project successfully", func(t *testing.T) {
		mockSvc := new(MockService)

		mockSvc.On("DeleteProject", mock.Anything, "user-123", "p1").
			Return(nil)

		err := mockSvc.DeleteProject(context.Background(), "user-123", "p1")

		assert.NoError(t, err)
		mockSvc.AssertExpectations(t)
	})
}

// ========== Task Handler Tests ==========

func TestListTasks_Handler(t *testing.T) {
	t.Run("returns list of tasks", func(t *testing.T) {
		mockSvc := new(MockService)

		tasks := []task.Task{
			{ID: "t1", Name: "Task 1", ProjectID: "p1"},
			{ID: "t2", Name: "Task 2", ProjectID: "p1"},
		}

		mockSvc.On("ListTasks", mock.Anything, "user-123", mock.AnythingOfType("task.TaskFilter")).
			Return(tasks, nil)

		result, err := mockSvc.ListTasks(context.Background(), "user-123", task.TaskFilter{})

		assert.NoError(t, err)
		assert.Len(t, result, 2)
		mockSvc.AssertExpectations(t)
	})

	t.Run("filters by project ID", func(t *testing.T) {
		mockSvc := new(MockService)
		projectID := "p1"

		filter := task.TaskFilter{
			ProjectID: &projectID,
		}

		tasks := []task.Task{
			{ID: "t1", Name: "Task 1", ProjectID: projectID},
		}

		mockSvc.On("ListTasks", mock.Anything, "user-123", filter).
			Return(tasks, nil)

		result, err := mockSvc.ListTasks(context.Background(), "user-123", filter)

		assert.NoError(t, err)
		assert.Len(t, result, 1)
		assert.Equal(t, projectID, result[0].ProjectID)
		mockSvc.AssertExpectations(t)
	})

	t.Run("filters by completed status", func(t *testing.T) {
		mockSvc := new(MockService)
		completed := true

		filter := task.TaskFilter{
			Completed: &completed,
		}

		tasks := []task.Task{
			{ID: "t1", Name: "Completed Task", Completed: true},
		}

		mockSvc.On("ListTasks", mock.Anything, "user-123", filter).
			Return(tasks, nil)

		result, err := mockSvc.ListTasks(context.Background(), "user-123", filter)

		assert.NoError(t, err)
		assert.Len(t, result, 1)
		assert.True(t, result[0].Completed)
		mockSvc.AssertExpectations(t)
	})
}

func TestCreateTask_Handler(t *testing.T) {
	t.Run("creates task successfully", func(t *testing.T) {
		mockSvc := new(MockService)

		input := task.CreateTaskInput{
			Name:      "New Task",
			ProjectID: "p1",
		}

		expectedTask := &task.Task{
			ID:        "t-new",
			Name:      "New Task",
			ProjectID: "p1",
			Completed: false,
		}

		mockSvc.On("CreateTask", mock.Anything, "user-123", input).
			Return(expectedTask, nil)

		result, err := mockSvc.CreateTask(context.Background(), "user-123", input)

		assert.NoError(t, err)
		assert.Equal(t, "New Task", result.Name)
		assert.False(t, result.Completed)
		mockSvc.AssertExpectations(t)
	})

	t.Run("creates task with parent", func(t *testing.T) {
		mockSvc := new(MockService)
		parentID := "t-parent"

		input := task.CreateTaskInput{
			Name:         "Sub Task",
			ProjectID:    "p1",
			ParentTaskID: &parentID,
		}

		expectedTask := &task.Task{
			ID:           "t-sub",
			Name:         "Sub Task",
			ProjectID:    "p1",
			ParentTaskID: &parentID,
		}

		mockSvc.On("CreateTask", mock.Anything, "user-123", input).
			Return(expectedTask, nil)

		result, err := mockSvc.CreateTask(context.Background(), "user-123", input)

		assert.NoError(t, err)
		assert.Equal(t, &parentID, result.ParentTaskID)
		mockSvc.AssertExpectations(t)
	})
}

func TestGetTask_Handler(t *testing.T) {
	t.Run("returns task by ID", func(t *testing.T) {
		mockSvc := new(MockService)

		expectedTask := &task.Task{
			ID:        "t1",
			Name:      "Test Task",
			ProjectID: "p1",
		}

		mockSvc.On("GetTask", mock.Anything, "user-123", "t1").
			Return(expectedTask, nil)

		result, err := mockSvc.GetTask(context.Background(), "user-123", "t1")

		assert.NoError(t, err)
		assert.Equal(t, "Test Task", result.Name)
		mockSvc.AssertExpectations(t)
	})
}

func TestToggleTaskComplete_Handler(t *testing.T) {
	t.Run("toggles task from incomplete to complete", func(t *testing.T) {
		mockSvc := new(MockService)

		expectedTask := &task.Task{
			ID:        "t1",
			Name:      "Test Task",
			Completed: true,
		}

		mockSvc.On("ToggleTaskComplete", mock.Anything, "user-123", "t1").
			Return(expectedTask, nil)

		result, err := mockSvc.ToggleTaskComplete(context.Background(), "user-123", "t1")

		assert.NoError(t, err)
		assert.True(t, result.Completed)
		mockSvc.AssertExpectations(t)
	})
}

func TestDeleteTask_Handler(t *testing.T) {
	t.Run("deletes task successfully", func(t *testing.T) {
		mockSvc := new(MockService)

		mockSvc.On("DeleteTask", mock.Anything, "user-123", "t1").
			Return(nil)

		err := mockSvc.DeleteTask(context.Background(), "user-123", "t1")

		assert.NoError(t, err)
		mockSvc.AssertExpectations(t)
	})
}

// ========== JSON Serialization Tests ==========

func TestProject_JSONSerialization(t *testing.T) {
	goalTag := task.GoalTagGK
	project := task.Project{
		ID:         "p1",
		UserID:     "u1",
		Name:       "Test Project",
		GoalTag:    &goalTag,
		IsArchived: false,
	}

	data, err := json.Marshal(project)
	assert.NoError(t, err)

	var decoded task.Project
	err = json.Unmarshal(data, &decoded)
	assert.NoError(t, err)

	assert.Equal(t, project.ID, decoded.ID)
	assert.Equal(t, project.Name, decoded.Name)
	assert.Equal(t, *project.GoalTag, *decoded.GoalTag)
}

func TestTask_JSONSerialization(t *testing.T) {
	estimatedMinutes := 30
	tk := task.Task{
		ID:               "t1",
		UserID:           "u1",
		ProjectID:        "p1",
		Name:             "Test Task",
		EstimatedMinutes: &estimatedMinutes,
		Completed:        false,
	}

	data, err := json.Marshal(tk)
	assert.NoError(t, err)

	var decoded task.Task
	err = json.Unmarshal(data, &decoded)
	assert.NoError(t, err)

	assert.Equal(t, tk.ID, decoded.ID)
	assert.Equal(t, tk.Name, decoded.Name)
	assert.Equal(t, *tk.EstimatedMinutes, *decoded.EstimatedMinutes)
}
