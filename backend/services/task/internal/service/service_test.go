package service

import (
	"context"
	"errors"
	"testing"

	task "github.com/kensan/backend/services/task/internal"
	"github.com/kensan/backend/services/task/internal/repository"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// Compile-time check that MockRepository implements repository.Repository
var _ repository.Repository = (*MockRepository)(nil)

// MockRepository is a mock implementation of the repository.Repository interface
type MockRepository struct {
	mock.Mock
}

func (m *MockRepository) ListProjects(ctx context.Context, userID string, filter task.ProjectFilter) ([]task.Project, error) {
	args := m.Called(ctx, userID, filter)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]task.Project), args.Error(1)
}

func (m *MockRepository) GetProjectByID(ctx context.Context, userID, projectID string) (*task.Project, error) {
	args := m.Called(ctx, userID, projectID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*task.Project), args.Error(1)
}

func (m *MockRepository) CreateProject(ctx context.Context, userID string, input task.CreateProjectInput) (*task.Project, error) {
	args := m.Called(ctx, userID, input)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*task.Project), args.Error(1)
}

func (m *MockRepository) UpdateProject(ctx context.Context, userID, projectID string, input task.UpdateProjectInput) (*task.Project, error) {
	args := m.Called(ctx, userID, projectID, input)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*task.Project), args.Error(1)
}

func (m *MockRepository) DeleteProject(ctx context.Context, userID, projectID string) error {
	args := m.Called(ctx, userID, projectID)
	return args.Error(0)
}

func (m *MockRepository) ListTasks(ctx context.Context, userID string, filter task.TaskFilter) ([]task.Task, error) {
	args := m.Called(ctx, userID, filter)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]task.Task), args.Error(1)
}

func (m *MockRepository) GetTaskByID(ctx context.Context, userID, taskID string) (*task.Task, error) {
	args := m.Called(ctx, userID, taskID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*task.Task), args.Error(1)
}

func (m *MockRepository) CreateTask(ctx context.Context, userID string, input task.CreateTaskInput) (*task.Task, error) {
	args := m.Called(ctx, userID, input)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*task.Task), args.Error(1)
}

func (m *MockRepository) UpdateTask(ctx context.Context, userID, taskID string, input task.UpdateTaskInput) (*task.Task, error) {
	args := m.Called(ctx, userID, taskID, input)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*task.Task), args.Error(1)
}

func (m *MockRepository) DeleteTask(ctx context.Context, userID, taskID string) error {
	args := m.Called(ctx, userID, taskID)
	return args.Error(0)
}

func (m *MockRepository) ToggleTaskComplete(ctx context.Context, userID, taskID string) (*task.Task, error) {
	args := m.Called(ctx, userID, taskID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*task.Task), args.Error(1)
}

func (m *MockRepository) GetChildTasks(ctx context.Context, userID, parentTaskID string) ([]task.Task, error) {
	args := m.Called(ctx, userID, parentTaskID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]task.Task), args.Error(1)
}

// ========== Project Tests ==========

func TestListProjects_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	filter := task.ProjectFilter{}

	expectedProjects := []task.Project{
		{ID: "project-1", Name: "Project 1", UserID: userID},
		{ID: "project-2", Name: "Project 2", UserID: userID},
	}

	mockRepo.On("ListProjects", ctx, userID, filter).Return(expectedProjects, nil)

	projects, err := svc.ListProjects(ctx, userID, filter)

	assert.NoError(t, err)
	assert.Len(t, projects, 2)
	assert.Equal(t, "Project 1", projects[0].Name)
	mockRepo.AssertExpectations(t)
}

func TestListProjects_EmptyResult(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	filter := task.ProjectFilter{}

	mockRepo.On("ListProjects", ctx, userID, filter).Return([]task.Project{}, nil)

	projects, err := svc.ListProjects(ctx, userID, filter)

	assert.NoError(t, err)
	assert.Empty(t, projects)
	mockRepo.AssertExpectations(t)
}

func TestListProjects_InvalidGoalTag(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	invalidTag := task.GoalTag("Invalid")
	filter := task.ProjectFilter{GoalTag: &invalidTag}

	projects, err := svc.ListProjects(ctx, userID, filter)

	assert.Error(t, err)
	assert.Equal(t, ErrInvalidGoalTag, err)
	assert.Nil(t, projects)
	mockRepo.AssertExpectations(t)
}

func TestListProjects_RepositoryError(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	filter := task.ProjectFilter{}

	mockRepo.On("ListProjects", ctx, userID, filter).Return(nil, errors.New("database error"))

	projects, err := svc.ListProjects(ctx, userID, filter)

	assert.Error(t, err)
	assert.Nil(t, projects)
	mockRepo.AssertExpectations(t)
}

func TestGetProject_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	projectID := "project-123"

	expectedProject := &task.Project{
		ID:     projectID,
		UserID: userID,
		Name:   "Test Project",
	}

	mockRepo.On("GetProjectByID", ctx, userID, projectID).Return(expectedProject, nil)

	project, err := svc.GetProject(ctx, userID, projectID)

	assert.NoError(t, err)
	assert.NotNil(t, project)
	assert.Equal(t, "Test Project", project.Name)
	mockRepo.AssertExpectations(t)
}

func TestGetProject_NotFound(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	projectID := "nonexistent"

	mockRepo.On("GetProjectByID", ctx, userID, projectID).Return(nil, nil)

	project, err := svc.GetProject(ctx, userID, projectID)

	assert.Error(t, err)
	assert.Equal(t, ErrProjectNotFound, err)
	assert.Nil(t, project)
	mockRepo.AssertExpectations(t)
}

func TestGetProject_RepositoryError(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	projectID := "project-123"

	mockRepo.On("GetProjectByID", ctx, userID, projectID).Return(nil, errors.New("database error"))

	project, err := svc.GetProject(ctx, userID, projectID)

	assert.Error(t, err)
	assert.Nil(t, project)
	mockRepo.AssertExpectations(t)
}

func TestCreateProject_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	goalTag := task.GoalTagGK
	input := task.CreateProjectInput{
		Name:    "New Project",
		GoalTag: &goalTag,
	}

	expectedProject := &task.Project{
		ID:      "project-new",
		UserID:  userID,
		Name:    "New Project",
		GoalTag: &goalTag,
	}

	mockRepo.On("CreateProject", ctx, userID, input).Return(expectedProject, nil)

	project, err := svc.CreateProject(ctx, userID, input)

	assert.NoError(t, err)
	assert.NotNil(t, project)
	assert.Equal(t, "New Project", project.Name)
	assert.Equal(t, &goalTag, project.GoalTag)
	mockRepo.AssertExpectations(t)
}

func TestCreateProject_EmptyName(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	input := task.CreateProjectInput{
		Name: "",
	}

	project, err := svc.CreateProject(ctx, userID, input)

	assert.Error(t, err)
	assert.Equal(t, ErrInvalidInput, err)
	assert.Nil(t, project)
	mockRepo.AssertExpectations(t)
}

func TestCreateProject_InvalidGoalTag(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	invalidTag := task.GoalTag("Invalid")
	input := task.CreateProjectInput{
		Name:    "New Project",
		GoalTag: &invalidTag,
	}

	project, err := svc.CreateProject(ctx, userID, input)

	assert.Error(t, err)
	assert.Equal(t, ErrInvalidGoalTag, err)
	assert.Nil(t, project)
	mockRepo.AssertExpectations(t)
}

func TestUpdateProject_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	projectID := "project-123"
	newName := "Updated Project"
	input := task.UpdateProjectInput{
		Name: &newName,
	}

	existingProject := &task.Project{ID: projectID, UserID: userID, Name: "Old Name"}
	expectedProject := &task.Project{
		ID:     projectID,
		UserID: userID,
		Name:   newName,
	}

	mockRepo.On("GetProjectByID", ctx, userID, projectID).Return(existingProject, nil)
	mockRepo.On("UpdateProject", ctx, userID, projectID, input).Return(expectedProject, nil)

	project, err := svc.UpdateProject(ctx, userID, projectID, input)

	assert.NoError(t, err)
	assert.NotNil(t, project)
	assert.Equal(t, "Updated Project", project.Name)
	mockRepo.AssertExpectations(t)
}

func TestUpdateProject_NotFound(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	projectID := "nonexistent"
	newName := "Updated Project"
	input := task.UpdateProjectInput{
		Name: &newName,
	}

	mockRepo.On("GetProjectByID", ctx, userID, projectID).Return(nil, nil)

	project, err := svc.UpdateProject(ctx, userID, projectID, input)

	assert.Error(t, err)
	assert.Equal(t, ErrProjectNotFound, err)
	assert.Nil(t, project)
	mockRepo.AssertExpectations(t)
}

func TestUpdateProject_InvalidGoalTag(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	projectID := "project-123"
	invalidTag := task.GoalTag("Invalid")
	input := task.UpdateProjectInput{
		GoalTag: &invalidTag,
	}

	existingProject := &task.Project{ID: projectID, UserID: userID, Name: "Project"}
	mockRepo.On("GetProjectByID", ctx, userID, projectID).Return(existingProject, nil)

	project, err := svc.UpdateProject(ctx, userID, projectID, input)

	assert.Error(t, err)
	assert.Equal(t, ErrInvalidGoalTag, err)
	assert.Nil(t, project)
	mockRepo.AssertExpectations(t)
}

func TestDeleteProject_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	projectID := "project-123"

	existingProject := &task.Project{ID: projectID, UserID: userID}
	mockRepo.On("GetProjectByID", ctx, userID, projectID).Return(existingProject, nil)
	mockRepo.On("DeleteProject", ctx, userID, projectID).Return(nil)

	err := svc.DeleteProject(ctx, userID, projectID)

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestDeleteProject_NotFound(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	projectID := "nonexistent"

	mockRepo.On("GetProjectByID", ctx, userID, projectID).Return(nil, nil)

	err := svc.DeleteProject(ctx, userID, projectID)

	assert.Error(t, err)
	assert.Equal(t, ErrProjectNotFound, err)
	mockRepo.AssertExpectations(t)
}

// ========== Task Tests ==========

func TestListTasks_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	filter := task.TaskFilter{}

	expectedTasks := []task.Task{
		{ID: "task-1", Name: "Task 1", UserID: userID, ProjectID: "project-1"},
		{ID: "task-2", Name: "Task 2", UserID: userID, ProjectID: "project-1"},
	}

	mockRepo.On("ListTasks", ctx, userID, filter).Return(expectedTasks, nil)

	tasks, err := svc.ListTasks(ctx, userID, filter)

	assert.NoError(t, err)
	assert.Len(t, tasks, 2)
	assert.Equal(t, "Task 1", tasks[0].Name)
	mockRepo.AssertExpectations(t)
}

func TestListTasks_WithProjectFilter(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	projectID := "project-123"
	filter := task.TaskFilter{
		ProjectID: &projectID,
	}

	expectedProject := &task.Project{ID: projectID, UserID: userID, Name: "Test Project"}
	expectedTasks := []task.Task{
		{ID: "task-1", Name: "Task 1", UserID: userID, ProjectID: projectID},
	}

	mockRepo.On("GetProjectByID", ctx, userID, projectID).Return(expectedProject, nil)
	mockRepo.On("ListTasks", ctx, userID, filter).Return(expectedTasks, nil)

	tasks, err := svc.ListTasks(ctx, userID, filter)

	assert.NoError(t, err)
	assert.Len(t, tasks, 1)
	assert.Equal(t, projectID, tasks[0].ProjectID)
	mockRepo.AssertExpectations(t)
}

func TestListTasks_WithProjectFilter_ProjectNotFound(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	projectID := "nonexistent"
	filter := task.TaskFilter{
		ProjectID: &projectID,
	}

	mockRepo.On("GetProjectByID", ctx, userID, projectID).Return(nil, nil)

	tasks, err := svc.ListTasks(ctx, userID, filter)

	assert.Error(t, err)
	assert.Equal(t, ErrProjectNotFound, err)
	assert.Nil(t, tasks)
	mockRepo.AssertExpectations(t)
}

func TestListTasks_WithParentTaskFilter(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	parentTaskID := "task-parent"
	filter := task.TaskFilter{
		ParentTaskID: &parentTaskID,
	}

	expectedParentTask := &task.Task{ID: parentTaskID, UserID: userID, Name: "Parent Task"}
	expectedTasks := []task.Task{
		{ID: "task-child-1", Name: "Child Task 1", UserID: userID, ParentTaskID: &parentTaskID},
	}

	mockRepo.On("GetTaskByID", ctx, userID, parentTaskID).Return(expectedParentTask, nil)
	mockRepo.On("ListTasks", ctx, userID, filter).Return(expectedTasks, nil)

	tasks, err := svc.ListTasks(ctx, userID, filter)

	assert.NoError(t, err)
	assert.Len(t, tasks, 1)
	mockRepo.AssertExpectations(t)
}

func TestListTasks_WithParentTaskFilter_ParentNotFound(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	parentTaskID := "nonexistent"
	filter := task.TaskFilter{
		ParentTaskID: &parentTaskID,
	}

	mockRepo.On("GetTaskByID", ctx, userID, parentTaskID).Return(nil, nil)

	tasks, err := svc.ListTasks(ctx, userID, filter)

	assert.Error(t, err)
	assert.Equal(t, ErrTaskNotFound, err)
	assert.Nil(t, tasks)
	mockRepo.AssertExpectations(t)
}

func TestGetTask_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	taskID := "task-123"

	expectedTask := &task.Task{
		ID:        taskID,
		UserID:    userID,
		ProjectID: "project-1",
		Name:      "Test Task",
		Completed: false,
	}

	mockRepo.On("GetTaskByID", ctx, userID, taskID).Return(expectedTask, nil)

	resultTask, err := svc.GetTask(ctx, userID, taskID)

	assert.NoError(t, err)
	assert.NotNil(t, resultTask)
	assert.Equal(t, "Test Task", resultTask.Name)
	assert.False(t, resultTask.Completed)
	mockRepo.AssertExpectations(t)
}

func TestGetTask_NotFound(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	taskID := "nonexistent"

	mockRepo.On("GetTaskByID", ctx, userID, taskID).Return(nil, nil)

	resultTask, err := svc.GetTask(ctx, userID, taskID)

	assert.Error(t, err)
	assert.Equal(t, ErrTaskNotFound, err)
	assert.Nil(t, resultTask)
	mockRepo.AssertExpectations(t)
}

func TestCreateTask_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	projectID := "project-123"
	input := task.CreateTaskInput{
		Name:      "New Task",
		ProjectID: projectID,
	}

	expectedProject := &task.Project{ID: projectID, UserID: userID, Name: "Test Project"}
	expectedTask := &task.Task{
		ID:        "task-new",
		UserID:    userID,
		ProjectID: projectID,
		Name:      "New Task",
		Completed: false,
	}

	mockRepo.On("GetProjectByID", ctx, userID, projectID).Return(expectedProject, nil)
	mockRepo.On("CreateTask", ctx, userID, input).Return(expectedTask, nil)

	resultTask, err := svc.CreateTask(ctx, userID, input)

	assert.NoError(t, err)
	assert.NotNil(t, resultTask)
	assert.Equal(t, "New Task", resultTask.Name)
	assert.Equal(t, projectID, resultTask.ProjectID)
	mockRepo.AssertExpectations(t)
}

func TestCreateTask_EmptyName(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	input := task.CreateTaskInput{
		Name:      "",
		ProjectID: "project-123",
	}

	resultTask, err := svc.CreateTask(ctx, userID, input)

	assert.Error(t, err)
	assert.Equal(t, ErrInvalidInput, err)
	assert.Nil(t, resultTask)
	mockRepo.AssertExpectations(t)
}

func TestCreateTask_EmptyProjectID(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	input := task.CreateTaskInput{
		Name:      "New Task",
		ProjectID: "",
	}

	resultTask, err := svc.CreateTask(ctx, userID, input)

	assert.Error(t, err)
	assert.Equal(t, ErrInvalidInput, err)
	assert.Nil(t, resultTask)
	mockRepo.AssertExpectations(t)
}

func TestCreateTask_ProjectNotFound(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	projectID := "nonexistent"
	input := task.CreateTaskInput{
		Name:      "New Task",
		ProjectID: projectID,
	}

	mockRepo.On("GetProjectByID", ctx, userID, projectID).Return(nil, nil)

	resultTask, err := svc.CreateTask(ctx, userID, input)

	assert.Error(t, err)
	assert.Equal(t, ErrProjectNotFound, err)
	assert.Nil(t, resultTask)
	mockRepo.AssertExpectations(t)
}

func TestCreateTask_WithParentTask_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	projectID := "project-123"
	parentTaskID := "task-parent"
	input := task.CreateTaskInput{
		Name:         "Child Task",
		ProjectID:    projectID,
		ParentTaskID: &parentTaskID,
	}

	expectedProject := &task.Project{ID: projectID, UserID: userID, Name: "Test Project"}
	expectedParentTask := &task.Task{ID: parentTaskID, UserID: userID, Name: "Parent Task"}
	expectedTask := &task.Task{
		ID:           "task-new",
		UserID:       userID,
		ProjectID:    projectID,
		Name:         "Child Task",
		ParentTaskID: &parentTaskID,
		Completed:    false,
	}

	mockRepo.On("GetProjectByID", ctx, userID, projectID).Return(expectedProject, nil)
	mockRepo.On("GetTaskByID", ctx, userID, parentTaskID).Return(expectedParentTask, nil)
	mockRepo.On("CreateTask", ctx, userID, input).Return(expectedTask, nil)

	resultTask, err := svc.CreateTask(ctx, userID, input)

	assert.NoError(t, err)
	assert.NotNil(t, resultTask)
	assert.Equal(t, &parentTaskID, resultTask.ParentTaskID)
	mockRepo.AssertExpectations(t)
}

func TestCreateTask_WithParentTask_ParentNotFound(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	projectID := "project-123"
	parentTaskID := "nonexistent"
	input := task.CreateTaskInput{
		Name:         "Child Task",
		ProjectID:    projectID,
		ParentTaskID: &parentTaskID,
	}

	expectedProject := &task.Project{ID: projectID, UserID: userID, Name: "Test Project"}
	mockRepo.On("GetProjectByID", ctx, userID, projectID).Return(expectedProject, nil)
	mockRepo.On("GetTaskByID", ctx, userID, parentTaskID).Return(nil, nil)

	resultTask, err := svc.CreateTask(ctx, userID, input)

	assert.Error(t, err)
	assert.Equal(t, ErrTaskNotFound, err)
	assert.Nil(t, resultTask)
	mockRepo.AssertExpectations(t)
}

func TestUpdateTask_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	taskID := "task-123"
	newName := "Updated Task"
	input := task.UpdateTaskInput{
		Name: &newName,
	}

	existingTask := &task.Task{ID: taskID, UserID: userID, Name: "Old Task"}
	expectedTask := &task.Task{
		ID:     taskID,
		UserID: userID,
		Name:   newName,
	}

	mockRepo.On("GetTaskByID", ctx, userID, taskID).Return(existingTask, nil)
	mockRepo.On("UpdateTask", ctx, userID, taskID, input).Return(expectedTask, nil)

	resultTask, err := svc.UpdateTask(ctx, userID, taskID, input)

	assert.NoError(t, err)
	assert.NotNil(t, resultTask)
	assert.Equal(t, "Updated Task", resultTask.Name)
	mockRepo.AssertExpectations(t)
}

func TestUpdateTask_NotFound(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	taskID := "nonexistent"
	newName := "Updated Task"
	input := task.UpdateTaskInput{
		Name: &newName,
	}

	mockRepo.On("GetTaskByID", ctx, userID, taskID).Return(nil, nil)

	resultTask, err := svc.UpdateTask(ctx, userID, taskID, input)

	assert.Error(t, err)
	assert.Equal(t, ErrTaskNotFound, err)
	assert.Nil(t, resultTask)
	mockRepo.AssertExpectations(t)
}

func TestUpdateTask_ChangeProject_ProjectNotFound(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	taskID := "task-123"
	newProjectID := "nonexistent"
	input := task.UpdateTaskInput{
		ProjectID: &newProjectID,
	}

	existingTask := &task.Task{ID: taskID, UserID: userID, Name: "Task"}
	mockRepo.On("GetTaskByID", ctx, userID, taskID).Return(existingTask, nil)
	mockRepo.On("GetProjectByID", ctx, userID, newProjectID).Return(nil, nil)

	resultTask, err := svc.UpdateTask(ctx, userID, taskID, input)

	assert.Error(t, err)
	assert.Equal(t, ErrProjectNotFound, err)
	assert.Nil(t, resultTask)
	mockRepo.AssertExpectations(t)
}

func TestUpdateTask_ChangeParent_CircularReference(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	taskID := "task-123"
	input := task.UpdateTaskInput{
		ParentTaskID: &taskID, // Self-reference
	}

	existingTask := &task.Task{ID: taskID, UserID: userID, Name: "Task"}
	mockRepo.On("GetTaskByID", ctx, userID, taskID).Return(existingTask, nil).Once()
	mockRepo.On("GetTaskByID", ctx, userID, taskID).Return(existingTask, nil).Once()

	resultTask, err := svc.UpdateTask(ctx, userID, taskID, input)

	assert.Error(t, err)
	assert.Equal(t, ErrInvalidInput, err)
	assert.Nil(t, resultTask)
	mockRepo.AssertExpectations(t)
}

func TestDeleteTask_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	taskID := "task-123"

	existingTask := &task.Task{ID: taskID, UserID: userID}
	mockRepo.On("GetTaskByID", ctx, userID, taskID).Return(existingTask, nil)
	mockRepo.On("DeleteTask", ctx, userID, taskID).Return(nil)

	err := svc.DeleteTask(ctx, userID, taskID)

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestDeleteTask_NotFound(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	taskID := "nonexistent"

	mockRepo.On("GetTaskByID", ctx, userID, taskID).Return(nil, nil)

	err := svc.DeleteTask(ctx, userID, taskID)

	assert.Error(t, err)
	assert.Equal(t, ErrTaskNotFound, err)
	mockRepo.AssertExpectations(t)
}

func TestToggleTaskComplete_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	taskID := "task-123"

	existingTask := &task.Task{
		ID:        taskID,
		UserID:    userID,
		ProjectID: "project-1",
		Name:      "Test Task",
		Completed: false,
	}
	// Task is initially not completed, toggle should make it completed
	expectedTask := &task.Task{
		ID:        taskID,
		UserID:    userID,
		ProjectID: "project-1",
		Name:      "Test Task",
		Completed: true, // After toggle
	}

	mockRepo.On("GetTaskByID", ctx, userID, taskID).Return(existingTask, nil)
	mockRepo.On("ToggleTaskComplete", ctx, userID, taskID).Return(expectedTask, nil)

	resultTask, err := svc.ToggleTaskComplete(ctx, userID, taskID)

	assert.NoError(t, err)
	assert.NotNil(t, resultTask)
	assert.True(t, resultTask.Completed)
	mockRepo.AssertExpectations(t)
}

func TestToggleTaskComplete_NotFound(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	taskID := "nonexistent"

	mockRepo.On("GetTaskByID", ctx, userID, taskID).Return(nil, nil)

	resultTask, err := svc.ToggleTaskComplete(ctx, userID, taskID)

	assert.Error(t, err)
	assert.Equal(t, ErrTaskNotFound, err)
	assert.Nil(t, resultTask)
	mockRepo.AssertExpectations(t)
}

func TestGetChildTasks_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	parentTaskID := "task-parent"

	parentTask := &task.Task{
		ID:     parentTaskID,
		UserID: userID,
		Name:   "Parent Task",
	}
	expectedTasks := []task.Task{
		{ID: "task-child-1", Name: "Child Task 1", UserID: userID, ParentTaskID: &parentTaskID},
		{ID: "task-child-2", Name: "Child Task 2", UserID: userID, ParentTaskID: &parentTaskID},
	}

	mockRepo.On("GetTaskByID", ctx, userID, parentTaskID).Return(parentTask, nil)
	mockRepo.On("GetChildTasks", ctx, userID, parentTaskID).Return(expectedTasks, nil)

	tasks, err := svc.GetChildTasks(ctx, userID, parentTaskID)

	assert.NoError(t, err)
	assert.Len(t, tasks, 2)
	assert.Equal(t, "Child Task 1", tasks[0].Name)
	mockRepo.AssertExpectations(t)
}

func TestGetChildTasks_ParentNotFound(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := NewService(mockRepo)

	ctx := context.Background()
	userID := "user-123"
	parentTaskID := "nonexistent"

	mockRepo.On("GetTaskByID", ctx, userID, parentTaskID).Return(nil, nil)

	tasks, err := svc.GetChildTasks(ctx, userID, parentTaskID)

	assert.Error(t, err)
	assert.Equal(t, ErrTaskNotFound, err)
	assert.Nil(t, tasks)
	mockRepo.AssertExpectations(t)
}

// ========== GoalTag Validation Tests ==========

func TestGoalTag_IsValid(t *testing.T) {
	testCases := []struct {
		tag      task.GoalTag
		expected bool
	}{
		{task.GoalTagGK, true},
		{task.GoalTagOSS, true},
		{task.GoalTagOutput, true},
		{task.GoalTagOther, true},
		{task.GoalTag("Invalid"), false},
		{task.GoalTag(""), false},
	}

	for _, tc := range testCases {
		t.Run(string(tc.tag), func(t *testing.T) {
			result := tc.tag.IsValid()
			assert.Equal(t, tc.expected, result)
		})
	}
}
