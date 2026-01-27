# Kensan Architecture Refactoring Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply SOLID principles and Clean Architecture patterns across all three codebases (Backend Go, Frontend React, AI Python) to reduce technical debt and improve maintainability.

**Architecture:** Refactor in phases - Backend first (foundational), then AI (depends on similar patterns), then Frontend. Each phase focuses on interface segregation, dependency inversion, and reducing code duplication. All changes maintain backward compatibility.

**Tech Stack:** Go 1.24 (chi, pgx), React 18 (Zustand, TypeScript), Python 3.12 (FastAPI, asyncpg)

---

## Phase 1: Backend Go Refactoring

### Task 1: Create Shared Error Constants

**Goal:** Centralize error definitions to eliminate duplication across 9 services.

**Files:**
- Modify: `backend/shared/errors/errors.go`
- Modify: `backend/services/task/internal/service/service.go:11-22`
- Modify: `backend/services/timeblock/internal/service/service.go`
- Modify: `backend/services/user/internal/service/service.go`

**Step 1: Extend shared/errors/errors.go with entity-specific helpers**

```go
// Add to backend/shared/errors/errors.go

// Entity-specific not found errors
func TaskNotFound() error {
	return fmt.Errorf("task %w", ErrNotFound)
}

func GoalNotFound() error {
	return fmt.Errorf("goal %w", ErrNotFound)
}

func MilestoneNotFound() error {
	return fmt.Errorf("milestone %w", ErrNotFound)
}

func TagNotFound() error {
	return fmt.Errorf("tag %w", ErrNotFound)
}

func TimeBlockNotFound() error {
	return fmt.Errorf("time block %w", ErrNotFound)
}

func TimeEntryNotFound() error {
	return fmt.Errorf("time entry %w", ErrNotFound)
}

func UserNotFound() error {
	return fmt.Errorf("user %w", ErrNotFound)
}

func NoteNotFound() error {
	return fmt.Errorf("note %w", ErrNotFound)
}

func MemoNotFound() error {
	return fmt.Errorf("memo %w", ErrNotFound)
}

func DiaryNotFound() error {
	return fmt.Errorf("diary entry %w", ErrNotFound)
}

func RecordNotFound() error {
	return fmt.Errorf("learning record %w", ErrNotFound)
}

func RoutineNotFound() error {
	return fmt.Errorf("routine task %w", ErrNotFound)
}

// Validation errors
func InvalidStatus(entity string) error {
	return fmt.Errorf("invalid %s status: %w", entity, ErrInvalidInput)
}

func InvalidDate() error {
	return fmt.Errorf("invalid date: %w", ErrInvalidInput)
}

func InvalidFrequency() error {
	return fmt.Errorf("invalid frequency: %w", ErrInvalidInput)
}

func InvalidEntityType() error {
	return fmt.Errorf("invalid entity type: %w", ErrInvalidInput)
}
```

**Step 2: Run existing tests to ensure shared package compiles**

Run: `cd /home/yu-min/Repositories/kensan-mockup/backend && go build ./shared/...`
Expected: Build succeeds

**Step 3: Update task service to use shared errors**

Replace in `backend/services/task/internal/service/service.go`:

```go
package service

import (
	"context"

	"github.com/kensan/backend/services/task/internal/repository"
	"github.com/kensan/backend/services/task/internal/task"
	"github.com/kensan/backend/shared/errors"
)

// Remove local error definitions (lines 11-22)
// Use errors.TaskNotFound(), errors.GoalNotFound(), etc.
```

**Step 4: Update all error returns in task service**

Replace patterns like:
- `return nil, ErrTaskNotFound` → `return nil, errors.TaskNotFound()`
- `return nil, ErrGoalNotFound` → `return nil, errors.GoalNotFound()`
- `return nil, ErrInvalidInput` → `return nil, errors.ErrInvalidInput`
- `return nil, ErrInvalidStatus` → `return nil, errors.InvalidStatus("milestone")`

**Step 5: Run task service tests**

Run: `cd /home/yu-min/Repositories/kensan-mockup/backend && go test ./services/task/... -v`
Expected: All tests pass

**Step 6: Commit**

```bash
git add backend/shared/errors/errors.go backend/services/task/internal/service/service.go
git commit -m "refactor(backend): centralize error definitions in shared package

- Add entity-specific error helpers to shared/errors
- Migrate task service to use shared errors
- Remove duplicated error definitions"
```

---

### Task 2: Apply Shared Errors to Remaining Services

**Goal:** Migrate all services to use shared error package.

**Files:**
- Modify: `backend/services/timeblock/internal/service/service.go`
- Modify: `backend/services/user/internal/service/service.go`
- Modify: `backend/services/note/internal/service/service.go`
- Modify: `backend/services/memo/internal/service/service.go`
- Modify: `backend/services/diary/internal/service/service.go`
- Modify: `backend/services/record/internal/service/service.go`
- Modify: `backend/services/routine/internal/service/service.go`
- Modify: `backend/services/analytics/internal/service/service.go`

**Step 1: Update timeblock service**

Remove local error vars and import shared errors:
```go
import "github.com/kensan/backend/shared/errors"

// Replace:
// ErrTimeBlockNotFound → errors.TimeBlockNotFound()
// ErrTimeEntryNotFound → errors.TimeEntryNotFound()
// ErrInvalidDate → errors.InvalidDate()
```

**Step 2: Update user service**

```go
// Replace:
// ErrUserNotFound → errors.UserNotFound()
// ErrUserExists → errors.ErrAlreadyExists
// ErrInvalidCredentials → errors.ErrUnauthorized
```

**Step 3: Update note, memo, diary, record, routine services**

Apply same pattern to each service.

**Step 4: Run all backend tests**

Run: `cd /home/yu-min/Repositories/kensan-mockup/backend && go test ./... -v`
Expected: All tests pass

**Step 5: Commit**

```bash
git add backend/services/*/internal/service/service.go
git commit -m "refactor(backend): migrate all services to shared errors

- Remove duplicated error definitions from 8 services
- Standardize error handling across codebase"
```

---

### Task 3: Create Service Interfaces for DIP

**Goal:** Define service interfaces to enable dependency inversion in handlers.

**Files:**
- Create: `backend/services/task/internal/service/interface.go`
- Modify: `backend/services/task/internal/handler/handler.go:15-16`

**Step 1: Create service interface file**

Create `backend/services/task/internal/service/interface.go`:

```go
package service

import (
	"context"

	"github.com/kensan/backend/services/task/internal/task"
)

// GoalService defines goal operations
type GoalService interface {
	ListGoals(ctx context.Context, userID string, filter task.GoalFilter) ([]task.Goal, error)
	GetGoalByID(ctx context.Context, userID, goalID string) (*task.Goal, error)
	CreateGoal(ctx context.Context, userID string, input task.CreateGoalInput) (*task.Goal, error)
	UpdateGoal(ctx context.Context, userID, goalID string, input task.UpdateGoalInput) (*task.Goal, error)
	DeleteGoal(ctx context.Context, userID, goalID string) error
}

// MilestoneService defines milestone operations
type MilestoneService interface {
	ListMilestones(ctx context.Context, userID string, filter task.MilestoneFilter) ([]task.Milestone, error)
	GetMilestoneByID(ctx context.Context, userID, milestoneID string) (*task.Milestone, error)
	CreateMilestone(ctx context.Context, userID string, input task.CreateMilestoneInput) (*task.Milestone, error)
	UpdateMilestone(ctx context.Context, userID, milestoneID string, input task.UpdateMilestoneInput) (*task.Milestone, error)
	DeleteMilestone(ctx context.Context, userID, milestoneID string) error
}

// TagService defines tag operations
type TagService interface {
	ListTags(ctx context.Context, userID string) ([]task.Tag, error)
	GetTagByID(ctx context.Context, userID, tagID string) (*task.Tag, error)
	CreateTag(ctx context.Context, userID string, input task.CreateTagInput) (*task.Tag, error)
	UpdateTag(ctx context.Context, userID, tagID string, input task.UpdateTagInput) (*task.Tag, error)
	DeleteTag(ctx context.Context, userID, tagID string) error
}

// TaskService defines task operations
type TaskService interface {
	ListTasks(ctx context.Context, userID string, filter task.TaskFilter) ([]task.Task, error)
	GetTaskByID(ctx context.Context, userID, taskID string) (*task.Task, error)
	CreateTask(ctx context.Context, userID string, input task.CreateTaskInput) (*task.Task, error)
	UpdateTask(ctx context.Context, userID, taskID string, input task.UpdateTaskInput) (*task.Task, error)
	DeleteTask(ctx context.Context, userID, taskID string) error
	CompleteTask(ctx context.Context, userID, taskID string) (*task.Task, error)
}

// EntityMemoService defines entity memo operations
type EntityMemoService interface {
	ListEntityMemos(ctx context.Context, userID string, filter task.EntityMemoFilter) ([]task.EntityMemo, error)
	GetEntityMemoByID(ctx context.Context, userID, memoID string) (*task.EntityMemo, error)
	CreateEntityMemo(ctx context.Context, userID string, input task.CreateEntityMemoInput) (*task.EntityMemo, error)
	UpdateEntityMemo(ctx context.Context, userID, memoID string, input task.UpdateEntityMemoInput) (*task.EntityMemo, error)
	DeleteEntityMemo(ctx context.Context, userID, memoID string) error
}

// TodoService defines recurring todo operations
type TodoService interface {
	ListTodos(ctx context.Context, userID string, filter task.TodoFilter) ([]task.Todo, error)
	ListTodosWithStatus(ctx context.Context, userID string, filter task.TodoFilter, date string) ([]task.TodoWithStatus, error)
	GetTodoByID(ctx context.Context, userID, todoID string) (*task.Todo, error)
	CreateTodo(ctx context.Context, userID string, input task.CreateTodoInput) (*task.Todo, error)
	UpdateTodo(ctx context.Context, userID, todoID string, input task.UpdateTodoInput) (*task.Todo, error)
	DeleteTodo(ctx context.Context, userID, todoID string) error
	CompleteTodoForDate(ctx context.Context, userID, todoID, date string) error
	UncompleteTodoForDate(ctx context.Context, userID, todoID, date string) error
}

// FullService combines all task-related services (for backward compatibility)
type FullService interface {
	GoalService
	MilestoneService
	TagService
	TaskService
	EntityMemoService
	TodoService
}

// Verify Service implements FullService
var _ FullService = (*Service)(nil)
```

**Step 2: Build to verify interface compliance**

Run: `cd /home/yu-min/Repositories/kensan-mockup/backend && go build ./services/task/...`
Expected: Build succeeds (Service implements all interface methods)

**Step 3: Update handler to use interface**

Modify `backend/services/task/internal/handler/handler.go`:

```go
package handler

import (
	// ... existing imports
	"github.com/kensan/backend/services/task/internal/service"
)

// Handler handles HTTP requests for task-related operations
type Handler struct {
	service service.FullService  // Changed from *service.Service to interface
}

// NewHandler creates a new Handler
func NewHandler(svc service.FullService) *Handler {
	return &Handler{service: svc}
}
```

**Step 4: Run task service tests**

Run: `cd /home/yu-min/Repositories/kensan-mockup/backend && go test ./services/task/... -v`
Expected: All tests pass

**Step 5: Commit**

```bash
git add backend/services/task/internal/service/interface.go backend/services/task/internal/handler/handler.go
git commit -m "refactor(backend/task): introduce service interfaces for DIP

- Create service/interface.go with segregated interfaces
- Update handler to depend on FullService interface
- Enables mock injection for unit testing"
```

---

### Task 4: Create Service Interfaces for Other Services

**Goal:** Apply service interface pattern to timeblock, note, and user services.

**Files:**
- Create: `backend/services/timeblock/internal/service/interface.go`
- Modify: `backend/services/timeblock/internal/handler/handler.go`
- Create: `backend/services/note/internal/service/interface.go`
- Modify: `backend/services/note/internal/handler/handler.go`
- Create: `backend/services/user/internal/service/interface.go`
- Modify: `backend/services/user/internal/handler/handler.go`

**Step 1: Create timeblock service interface**

Create `backend/services/timeblock/internal/service/interface.go`:

```go
package service

import (
	"context"

	"github.com/kensan/backend/services/timeblock/internal/timeblock"
)

// TimeBlockService defines time block operations
type TimeBlockService interface {
	ListTimeBlocks(ctx context.Context, userID string, filter timeblock.TimeBlockFilter) ([]timeblock.TimeBlock, error)
	GetTimeBlockByID(ctx context.Context, userID, blockID string) (*timeblock.TimeBlock, error)
	CreateTimeBlock(ctx context.Context, userID string, input timeblock.CreateTimeBlockInput) (*timeblock.TimeBlock, error)
	UpdateTimeBlock(ctx context.Context, userID, blockID string, input timeblock.UpdateTimeBlockInput) (*timeblock.TimeBlock, error)
	DeleteTimeBlock(ctx context.Context, userID, blockID string) error
	GenerateFromRoutines(ctx context.Context, userID, date string) ([]timeblock.TimeBlock, error)
}

// TimeEntryService defines time entry operations
type TimeEntryService interface {
	ListTimeEntries(ctx context.Context, userID string, filter timeblock.TimeEntryFilter) ([]timeblock.TimeEntry, error)
	GetTimeEntryByID(ctx context.Context, userID, entryID string) (*timeblock.TimeEntry, error)
	CreateTimeEntry(ctx context.Context, userID string, input timeblock.CreateTimeEntryInput) (*timeblock.TimeEntry, error)
	UpdateTimeEntry(ctx context.Context, userID, entryID string, input timeblock.UpdateTimeEntryInput) (*timeblock.TimeEntry, error)
	DeleteTimeEntry(ctx context.Context, userID, entryID string) error
}

// TimerService defines timer operations
type TimerService interface {
	GetCurrentTimer(ctx context.Context, userID string) (*timeblock.RunningTimer, error)
	StartTimer(ctx context.Context, userID string, input timeblock.StartTimerInput) (*timeblock.RunningTimer, error)
	StopTimer(ctx context.Context, userID string) (*timeblock.TimeEntry, error)
}

// FullService combines all timeblock-related services
type FullService interface {
	TimeBlockService
	TimeEntryService
	TimerService
}

var _ FullService = (*Service)(nil)
```

**Step 2: Update timeblock handler**

Modify `backend/services/timeblock/internal/handler/handler.go`:

```go
type Handler struct {
	service service.FullService  // Interface instead of concrete
}

func NewHandler(svc service.FullService) *Handler {
	return &Handler{service: svc}
}
```

**Step 3: Create note service interface**

Create `backend/services/note/internal/service/interface.go`:

```go
package service

import (
	"context"

	"github.com/kensan/backend/services/note/internal/note"
)

// NoteService defines note operations
type NoteService interface {
	ListNotes(ctx context.Context, userID string, filter note.NoteFilter) ([]note.NoteListItem, error)
	GetNoteByID(ctx context.Context, userID, noteID string) (*note.Note, error)
	CreateNote(ctx context.Context, userID string, input note.CreateNoteInput) (*note.Note, error)
	UpdateNote(ctx context.Context, userID, noteID string, input note.UpdateNoteInput) (*note.Note, error)
	DeleteNote(ctx context.Context, userID, noteID string) error
	SearchNotes(ctx context.Context, userID string, query string, filter note.SearchFilter) ([]note.NoteSearchResult, error)
	ArchiveNote(ctx context.Context, userID, noteID string, archived bool) (*note.Note, error)
}

var _ NoteService = (*Service)(nil)
```

**Step 4: Create user service interface**

Create `backend/services/user/internal/service/interface.go`:

```go
package service

import (
	"context"

	"github.com/kensan/backend/services/user/internal/user"
)

// AuthService defines authentication operations
type AuthService interface {
	Register(ctx context.Context, input user.RegisterInput) (*user.AuthResponse, error)
	Login(ctx context.Context, input user.LoginInput) (*user.AuthResponse, error)
}

// UserService defines user operations
type UserService interface {
	GetProfile(ctx context.Context, userID string) (*user.User, error)
	UpdateProfile(ctx context.Context, userID string, input user.UpdateProfileInput) (*user.User, error)
}

// SettingsService defines settings operations
type SettingsService interface {
	GetSettings(ctx context.Context, userID string) (*user.Settings, error)
	UpdateSettings(ctx context.Context, userID string, input user.UpdateSettingsInput) (*user.Settings, error)
	RecordAIConsent(ctx context.Context, userID string) (*user.Settings, error)
}

// FullService combines all user-related services
type FullService interface {
	AuthService
	UserService
	SettingsService
}

var _ FullService = (*Service)(nil)
```

**Step 5: Update note and user handlers**

Apply same handler modification pattern.

**Step 6: Run all tests**

Run: `cd /home/yu-min/Repositories/kensan-mockup/backend && go test ./... -v`
Expected: All tests pass

**Step 7: Commit**

```bash
git add backend/services/*/internal/service/interface.go backend/services/*/internal/handler/handler.go
git commit -m "refactor(backend): add service interfaces to timeblock, note, user services

- Apply DIP pattern consistently across main services
- Enable dependency injection for testing"
```

---

### Task 5: Segregate Repository Interfaces (Task Service)

**Goal:** Split fat 45+ method repository interface into entity-specific interfaces.

**Files:**
- Modify: `backend/services/task/internal/repository/interface.go`
- Modify: `backend/services/task/internal/repository/repository.go`
- Modify: `backend/services/task/internal/service/service.go`

**Step 1: Refactor interface.go with segregated interfaces**

Replace `backend/services/task/internal/repository/interface.go`:

```go
package repository

import (
	"context"

	"github.com/kensan/backend/services/task/internal/task"
)

// GoalRepository defines goal data access operations
type GoalRepository interface {
	ListGoals(ctx context.Context, userID string, filter task.GoalFilter) ([]task.Goal, error)
	GetGoalByID(ctx context.Context, userID, goalID string) (*task.Goal, error)
	CreateGoal(ctx context.Context, goal *task.Goal) error
	UpdateGoal(ctx context.Context, goal *task.Goal) error
	DeleteGoal(ctx context.Context, userID, goalID string) error
}

// MilestoneRepository defines milestone data access operations
type MilestoneRepository interface {
	ListMilestones(ctx context.Context, userID string, filter task.MilestoneFilter) ([]task.Milestone, error)
	GetMilestoneByID(ctx context.Context, userID, milestoneID string) (*task.Milestone, error)
	CreateMilestone(ctx context.Context, milestone *task.Milestone) error
	UpdateMilestone(ctx context.Context, milestone *task.Milestone) error
	DeleteMilestone(ctx context.Context, userID, milestoneID string) error
}

// TagRepository defines tag data access operations
type TagRepository interface {
	ListTags(ctx context.Context, userID string) ([]task.Tag, error)
	GetTagByID(ctx context.Context, userID, tagID string) (*task.Tag, error)
	CreateTag(ctx context.Context, tag *task.Tag) error
	UpdateTag(ctx context.Context, tag *task.Tag) error
	DeleteTag(ctx context.Context, userID, tagID string) error
}

// TaskRepository defines task data access operations
type TaskRepository interface {
	ListTasks(ctx context.Context, userID string, filter task.TaskFilter) ([]task.Task, error)
	GetTaskByID(ctx context.Context, userID, taskID string) (*task.Task, error)
	CreateTask(ctx context.Context, tsk *task.Task) error
	UpdateTask(ctx context.Context, tsk *task.Task) error
	DeleteTask(ctx context.Context, userID, taskID string) error
	GetTaskTags(ctx context.Context, taskID string) ([]string, error)
	SetTaskTags(ctx context.Context, taskID string, tagIDs []string) error
	ReorderTasks(ctx context.Context, userID string, taskIDs []string) error
}

// EntityMemoRepository defines entity memo data access operations
type EntityMemoRepository interface {
	ListEntityMemos(ctx context.Context, userID string, filter task.EntityMemoFilter) ([]task.EntityMemo, error)
	GetEntityMemoByID(ctx context.Context, userID, memoID string) (*task.EntityMemo, error)
	CreateEntityMemo(ctx context.Context, memo *task.EntityMemo) error
	UpdateEntityMemo(ctx context.Context, memo *task.EntityMemo) error
	DeleteEntityMemo(ctx context.Context, userID, memoID string) error
}

// TodoRepository defines todo data access operations
type TodoRepository interface {
	ListTodos(ctx context.Context, userID string, filter task.TodoFilter) ([]task.Todo, error)
	ListTodosWithStatus(ctx context.Context, userID string, filter task.TodoFilter, date string) ([]task.TodoWithStatus, error)
	GetTodoByID(ctx context.Context, userID, todoID string) (*task.Todo, error)
	CreateTodo(ctx context.Context, todo *task.Todo) error
	UpdateTodo(ctx context.Context, todo *task.Todo) error
	DeleteTodo(ctx context.Context, userID, todoID string) error
	GetTodoCompletion(ctx context.Context, todoID, date string) (*task.TodoCompletion, error)
	CreateTodoCompletion(ctx context.Context, completion *task.TodoCompletion) error
	DeleteTodoCompletion(ctx context.Context, todoID, date string) error
}

// Repository combines all task-related repositories (backward compat)
type Repository interface {
	GoalRepository
	MilestoneRepository
	TagRepository
	TaskRepository
	EntityMemoRepository
	TodoRepository
}
```

**Step 2: Verify repository.go implements all interfaces**

Run: `cd /home/yu-min/Repositories/kensan-mockup/backend && go build ./services/task/...`
Expected: Build succeeds

**Step 3: Run tests**

Run: `cd /home/yu-min/Repositories/kensan-mockup/backend && go test ./services/task/... -v`
Expected: All tests pass

**Step 4: Commit**

```bash
git add backend/services/task/internal/repository/interface.go
git commit -m "refactor(backend/task): segregate repository interfaces (ISP)

- Split 45+ method interface into 6 entity-specific interfaces
- GoalRepository, MilestoneRepository, TagRepository, etc.
- Maintain backward compat with combined Repository interface"
```

---

### Task 6: Utilize HandleServiceError Helper

**Goal:** Reduce error handling boilerplate in handlers using shared helper.

**Files:**
- Modify: `backend/services/task/internal/handler/handler.go`

**Step 1: Create error mappings at package level**

Add to `backend/services/task/internal/handler/handler.go`:

```go
import (
	"github.com/kensan/backend/shared/errors"
	"github.com/kensan/backend/shared/middleware"
)

// Common error mappings for task service
var taskErrorMappings = map[error]middleware.ErrorMapping{
	errors.ErrNotFound:     {Status: http.StatusNotFound, Code: "NOT_FOUND", Message: "Resource not found"},
	errors.ErrInvalidInput: {Status: http.StatusBadRequest, Code: "INVALID_INPUT", Message: "Invalid input"},
	errors.ErrUnauthorized: {Status: http.StatusUnauthorized, Code: "UNAUTHORIZED", Message: "Unauthorized"},
}

// Helper to check wrapped errors
func handleTaskError(w http.ResponseWriter, r *http.Request, err error, defaultMsg string) {
	if errors.IsNotFound(err) {
		middleware.Error(w, r, http.StatusNotFound, "NOT_FOUND", err.Error())
		return
	}
	if errors.IsInvalidInput(err) {
		middleware.Error(w, r, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}
	middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", defaultMsg)
}
```

**Step 2: Refactor handler methods to use helper**

Before (verbose):
```go
func (h *Handler) GetTask(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	taskID := chi.URLParam(r, "taskId")

	task, err := h.service.GetTaskByID(r.Context(), userID, taskID)
	if err != nil {
		if errors.Is(err, service.ErrTaskNotFound) {
			middleware.Error(w, r, http.StatusNotFound, "NOT_FOUND", "Task not found")
			return
		}
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get task")
		return
	}
	middleware.JSON(w, r, http.StatusOK, task)
}
```

After (concise):
```go
func (h *Handler) GetTask(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	taskID := chi.URLParam(r, "taskId")

	task, err := h.service.GetTaskByID(r.Context(), userID, taskID)
	if err != nil {
		handleTaskError(w, r, err, "Failed to get task")
		return
	}
	middleware.JSON(w, r, http.StatusOK, task)
}
```

**Step 3: Apply to all handler methods**

Refactor all ~20 handler methods in task service.

**Step 4: Run tests**

Run: `cd /home/yu-min/Repositories/kensan-mockup/backend && go test ./services/task/... -v`
Expected: All tests pass

**Step 5: Commit**

```bash
git add backend/services/task/internal/handler/handler.go
git commit -m "refactor(backend/task): reduce error handling boilerplate

- Add handleTaskError helper function
- Simplify all handler methods
- Reduce ~100 lines of repetitive error handling"
```

---

## Phase 2: AI Python Refactoring

### Task 7: Create Unified Error Schema

**Goal:** Standardize error responses across AI service.

**Files:**
- Create: `kensan-ai/src/kensan_ai/errors.py`
- Modify: `kensan-ai/src/kensan_ai/tools/base.py`
- Modify: `kensan-ai/src/kensan_ai/api/routes.py`

**Step 1: Create error module**

Create `kensan-ai/src/kensan_ai/errors.py`:

```python
"""Unified error handling for Kensan AI service."""

from dataclasses import dataclass
from typing import Any


@dataclass
class ToolError(Exception):
    """Error raised by tools with structured information."""

    code: str
    message: str
    details: Any = None

    def __str__(self) -> str:
        return f"{self.code}: {self.message}"

    def to_dict(self) -> dict[str, Any]:
        result = {"code": self.code, "message": self.message}
        if self.details:
            result["details"] = self.details
        return result


class ValidationError(ToolError):
    """Validation error for invalid input."""

    def __init__(self, field: str, message: str):
        super().__init__(
            code="VALIDATION_ERROR",
            message=f"{field}: {message}",
            details={"field": field}
        )


class NotFoundError(ToolError):
    """Resource not found error."""

    def __init__(self, resource: str, resource_id: str | None = None):
        msg = f"{resource} not found"
        if resource_id:
            msg = f"{resource} '{resource_id}' not found"
        super().__init__(
            code="NOT_FOUND",
            message=msg,
            details={"resource": resource, "id": resource_id}
        )


class AuthenticationError(ToolError):
    """Authentication error."""

    def __init__(self, message: str = "Authentication required"):
        super().__init__(code="AUTHENTICATION_ERROR", message=message)


class AuthorizationError(ToolError):
    """Authorization error."""

    def __init__(self, message: str = "Permission denied"):
        super().__init__(code="AUTHORIZATION_ERROR", message=message)
```

**Step 2: Update tools/base.py to use ToolError**

Modify `kensan-ai/src/kensan_ai/tools/base.py`:

```python
from kensan_ai.errors import ToolError

async def execute_tool(name: str, args: dict[str, Any]) -> Any:
    """Execute a tool by name with given arguments."""
    tool = get_tool(name)
    if not tool:
        raise ToolError(code="UNKNOWN_TOOL", message=f"Tool '{name}' not found")

    try:
        result = await tool.func(args)
        return result
    except ToolError:
        raise  # Re-raise structured errors
    except Exception as e:
        raise ToolError(
            code="TOOL_EXECUTION_ERROR",
            message=str(e),
            details={"tool": name, "original_error": type(e).__name__}
        )
```

**Step 3: Add exception handler in main.py**

Add to `kensan-ai/src/kensan_ai/main.py`:

```python
from fastapi import Request
from fastapi.responses import JSONResponse
from kensan_ai.errors import ToolError, AuthenticationError

@app.exception_handler(ToolError)
async def tool_error_handler(request: Request, exc: ToolError):
    status_code = 400
    if isinstance(exc, AuthenticationError):
        status_code = 401
    return JSONResponse(
        status_code=status_code,
        content={"error": exc.to_dict()}
    )
```

**Step 4: Run tests**

Run: `cd /home/yu-min/Repositories/kensan-mockup/kensan-ai && pytest -v`
Expected: Tests pass (or create basic test if none exist)

**Step 5: Commit**

```bash
git add kensan-ai/src/kensan_ai/errors.py kensan-ai/src/kensan_ai/tools/base.py kensan-ai/src/kensan_ai/main.py
git commit -m "refactor(ai): add unified error schema

- Create errors.py with ToolError, ValidationError, NotFoundError
- Update tools/base.py to use structured errors
- Add FastAPI exception handler"
```

---

### Task 8: Extract MessageHistory Class from AgentRunner

**Goal:** Separate message management responsibility from AgentRunner.

**Files:**
- Create: `kensan-ai/src/kensan_ai/agents/message_history.py`
- Modify: `kensan-ai/src/kensan_ai/agents/base.py`

**Step 1: Create MessageHistory class**

Create `kensan-ai/src/kensan_ai/agents/message_history.py`:

```python
"""Message history management for agent conversations."""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class MessageHistory:
    """Manages conversation history for Claude API calls."""

    messages: list[dict[str, Any]] = field(default_factory=list)

    def add_user_message(self, content: str) -> None:
        """Add a user message to history."""
        self.messages.append({"role": "user", "content": content})

    def add_assistant_message(self, content: list[dict[str, Any]]) -> None:
        """Add an assistant message with content blocks."""
        self.messages.append({"role": "assistant", "content": content})

    def add_tool_results(self, results: list[dict[str, Any]]) -> None:
        """Add tool results as a user message."""
        self.messages.append({"role": "user", "content": results})

    def get_messages(self) -> list[dict[str, Any]]:
        """Get all messages for API call."""
        return self.messages.copy()

    def clear(self) -> None:
        """Clear message history."""
        self.messages.clear()

    def rollback_last_turn(self) -> None:
        """Remove the last assistant message and any subsequent tool results."""
        # Find last assistant message
        for i in range(len(self.messages) - 1, -1, -1):
            if self.messages[i]["role"] == "assistant":
                self.messages = self.messages[:i]
                return

    def __len__(self) -> int:
        return len(self.messages)
```

**Step 2: Update AgentRunner to use MessageHistory**

Modify `kensan-ai/src/kensan_ai/agents/base.py`:

```python
from kensan_ai.agents.message_history import MessageHistory

class AgentRunner:
    # ... existing __init__ ...

    async def run(
        self,
        prompt: str,
        user_id: str | None = None,
    ) -> AgentResult:
        """Run agent with given prompt."""
        self.user_id = user_id
        history = MessageHistory()
        history.add_user_message(prompt)

        tool_calls: list[dict[str, Any]] = []
        total_input_tokens = 0
        total_output_tokens = 0

        for turn in range(self.max_turns):
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                system=self.system_prompt,
                tools=self._get_tools_schema(),
                messages=history.get_messages(),
                temperature=self.temperature,
            )

            total_input_tokens += response.usage.input_tokens
            total_output_tokens += response.usage.output_tokens

            # Build assistant content
            assistant_content = []
            for block in response.content:
                if block.type == "text":
                    assistant_content.append({"type": "text", "text": block.text})
                elif block.type == "tool_use":
                    assistant_content.append({
                        "type": "tool_use",
                        "id": block.id,
                        "name": block.name,
                        "input": block.input,
                    })

            history.add_assistant_message(assistant_content)

            # Check for tool use
            tool_uses = [b for b in response.content if b.type == "tool_use"]
            if not tool_uses:
                # No tools, return final response
                final_text = next(
                    (b.text for b in response.content if b.type == "text"),
                    ""
                )
                return AgentResult(
                    text=final_text,
                    tool_calls=tool_calls,
                    tokens_input=total_input_tokens,
                    tokens_output=total_output_tokens,
                )

            # Execute tools and add results
            tool_results = await self._execute_tools(tool_uses, tool_calls)
            history.add_tool_results(tool_results)

        # Max turns reached
        return AgentResult(
            text="Max turns reached",
            tool_calls=tool_calls,
            tokens_input=total_input_tokens,
            tokens_output=total_output_tokens,
        )
```

**Step 3: Run tests**

Run: `cd /home/yu-min/Repositories/kensan-mockup/kensan-ai && pytest -v`
Expected: Tests pass

**Step 4: Commit**

```bash
git add kensan-ai/src/kensan_ai/agents/message_history.py kensan-ai/src/kensan_ai/agents/base.py
git commit -m "refactor(ai): extract MessageHistory from AgentRunner

- Create message_history.py with dedicated class
- Simplify AgentRunner.run() method
- Improve testability of message management"
```

---

### Task 9: Add Production Validation to Config

**Goal:** Ensure critical settings are validated in production.

**Files:**
- Modify: `kensan-ai/src/kensan_ai/config.py`

**Step 1: Add validators**

Modify `kensan-ai/src/kensan_ai/config.py`:

```python
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ... existing fields ...

    @field_validator("anthropic_api_key")
    @classmethod
    def validate_api_key(cls, v: str, info) -> str:
        """Ensure API key is set in production."""
        # Access other values via info.data
        env = info.data.get("server_env", "development")
        if env == "production" and not v:
            raise ValueError("ANTHROPIC_API_KEY is required in production")
        return v

    @field_validator("jwt_secret")
    @classmethod
    def validate_jwt_secret(cls, v: str, info) -> str:
        """Ensure JWT secret is changed in production."""
        env = info.data.get("server_env", "development")
        if env == "production" and v == "dev-secret-key-change-in-production":
            raise ValueError("JWT_SECRET must be changed in production")
        return v

    @field_validator("debug", mode="before")
    @classmethod
    def parse_bool(cls, v) -> bool:
        """Parse boolean from string."""
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            return v.lower() in ("true", "1", "yes")
        return bool(v)
```

**Step 2: Run tests with development config**

Run: `cd /home/yu-min/Repositories/kensan-mockup/kensan-ai && SERVER_ENV=development pytest -v`
Expected: Tests pass

**Step 3: Commit**

```bash
git add kensan-ai/src/kensan_ai/config.py
git commit -m "refactor(ai): add production config validation

- Require ANTHROPIC_API_KEY in production
- Require JWT_SECRET change in production
- Fix bool parsing from env vars"
```

---

### Task 10: Fix SQL Injection Vulnerability

**Goal:** Parameterize LIMIT clause in memory_tools.py.

**Files:**
- Modify: `kensan-ai/src/kensan_ai/tools/memory_tools.py`

**Step 1: Fix the vulnerable query**

Locate and fix in `kensan-ai/src/kensan_ai/tools/memory_tools.py`:

```python
@tool(
    name="get_recent_interactions",
    description="最近のインタラクションを取得します。",
    input_schema={
        "properties": {
            "user_id": {"type": "string", "description": "ユーザーID"},
            "limit": {"type": "integer", "description": "取得件数 (max 100)", "default": 20},
        },
        "required": ["user_id"],
    },
)
async def get_recent_interactions(args: dict[str, Any]) -> dict[str, Any]:
    """Get recent interactions for a user."""
    user_id = _parse_uuid(args.get("user_id"))
    if not user_id:
        return {"error": "Invalid or missing user_id"}

    # Cap limit to prevent abuse
    limit = min(args.get("limit", 20), 100)

    async with get_connection() as conn:
        rows = await conn.fetch(
            """
            SELECT id, session_id, situation, user_input, ai_output,
                   tool_calls, created_at
            FROM ai_interactions
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            """,
            user_id,
            limit,  # Parameterized, not f-string
        )

    return {
        "interactions": [dict(row) for row in rows]
    }
```

**Step 2: Search for other potential issues**

Run: `grep -r "LIMIT {" kensan-ai/src/`
Expected: No results (all fixed)

**Step 3: Run tests**

Run: `cd /home/yu-min/Repositories/kensan-mockup/kensan-ai && pytest -v`
Expected: Tests pass

**Step 4: Commit**

```bash
git add kensan-ai/src/kensan_ai/tools/memory_tools.py
git commit -m "fix(ai): parameterize SQL LIMIT clause

- Fix potential SQL injection in get_recent_interactions
- Cap limit to 100 to prevent abuse"
```

---

### Task 11: Create Shared Parser Utilities

**Goal:** Eliminate duplicated parsing code.

**Files:**
- Create: `kensan-ai/src/kensan_ai/lib/__init__.py`
- Create: `kensan-ai/src/kensan_ai/lib/parsers.py`
- Modify: `kensan-ai/src/kensan_ai/tools/db_tools.py`
- Modify: `kensan-ai/src/kensan_ai/api/routes.py`

**Step 1: Create lib module**

Create `kensan-ai/src/kensan_ai/lib/__init__.py`:

```python
"""Shared utility modules."""
```

Create `kensan-ai/src/kensan_ai/lib/parsers.py`:

```python
"""Shared parsing utilities."""

from datetime import date, time
from uuid import UUID


def parse_uuid(value: str | None) -> UUID | None:
    """Parse string to UUID, returning None if invalid."""
    if not value:
        return None
    try:
        return UUID(value)
    except (ValueError, TypeError):
        return None


def parse_date(value: str | None) -> date | None:
    """Parse string to date (YYYY-MM-DD format)."""
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except (ValueError, TypeError):
        return None


def parse_time(value: str | None) -> time | None:
    """Parse string to time (HH:MM or HH:MM:SS format)."""
    if not value:
        return None
    try:
        return time.fromisoformat(value)
    except (ValueError, TypeError):
        return None


def require_uuid(value: str | None, field_name: str = "id") -> UUID:
    """Parse and require a valid UUID, raising ValueError if invalid."""
    result = parse_uuid(value)
    if result is None:
        raise ValueError(f"Invalid or missing {field_name}")
    return result


def require_date(value: str | None, field_name: str = "date") -> date:
    """Parse and require a valid date, raising ValueError if invalid."""
    result = parse_date(value)
    if result is None:
        raise ValueError(f"Invalid or missing {field_name}")
    return result
```

**Step 2: Update db_tools.py to use shared parsers**

Modify `kensan-ai/src/kensan_ai/tools/db_tools.py`:

```python
from kensan_ai.lib.parsers import parse_uuid, parse_date, parse_time

# Remove local _parse_uuid, _parse_date, _parse_time functions
```

**Step 3: Update routes.py to use shared parsers**

Modify `kensan-ai/src/kensan_ai/api/routes.py`:

```python
from kensan_ai.lib.parsers import parse_uuid, parse_date

# Remove local parsing functions
```

**Step 4: Run tests**

Run: `cd /home/yu-min/Repositories/kensan-mockup/kensan-ai && pytest -v`
Expected: Tests pass

**Step 5: Commit**

```bash
git add kensan-ai/src/kensan_ai/lib/
git add kensan-ai/src/kensan_ai/tools/db_tools.py
git add kensan-ai/src/kensan_ai/api/routes.py
git commit -m "refactor(ai): extract shared parser utilities

- Create lib/parsers.py with parse_uuid, parse_date, parse_time
- Remove duplicated parsing code from db_tools.py and routes.py"
```

---

## Phase 3: Frontend React Refactoring

### Task 12: Split useTaskStore into Domain Stores

**Goal:** Separate concerns by creating dedicated stores per entity.

**Files:**
- Create: `src/stores/useGoalStore.ts`
- Create: `src/stores/useMilestoneStore.ts`
- Create: `src/stores/useTagStore.ts`
- Modify: `src/stores/useTaskStore.ts`

**Step 1: Create useGoalStore**

Create `src/stores/useGoalStore.ts`:

```typescript
import { create } from 'zustand'
import { goalsApi } from '@/api/services/tasks'
import type { Goal, CreateGoalInput, UpdateGoalInput } from '@/types'

interface GoalState {
  goals: Goal[]
  isLoading: boolean
  error: string | null

  // Actions
  fetchGoals: () => Promise<void>
  addGoal: (input: CreateGoalInput) => Promise<Goal>
  updateGoal: (id: string, input: UpdateGoalInput) => Promise<Goal>
  deleteGoal: (id: string) => Promise<void>

  // Selectors
  getGoalById: (id: string) => Goal | undefined
  clearError: () => void
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  isLoading: false,
  error: null,

  fetchGoals: async () => {
    set({ isLoading: true, error: null })
    try {
      const goals = await goalsApi.list()
      set({ goals, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  addGoal: async (input) => {
    const goal = await goalsApi.create(input)
    set((state) => ({ goals: [...state.goals, goal] }))
    return goal
  },

  updateGoal: async (id, input) => {
    const goal = await goalsApi.update(id, input)
    set((state) => ({
      goals: state.goals.map((g) => (g.id === id ? goal : g)),
    }))
    return goal
  },

  deleteGoal: async (id) => {
    await goalsApi.delete(id)
    set((state) => ({
      goals: state.goals.filter((g) => g.id !== id),
    }))
  },

  getGoalById: (id) => get().goals.find((g) => g.id === id),

  clearError: () => set({ error: null }),
}))
```

**Step 2: Create useMilestoneStore**

Create `src/stores/useMilestoneStore.ts`:

```typescript
import { create } from 'zustand'
import { milestonesApi } from '@/api/services/tasks'
import type { Milestone, CreateMilestoneInput, UpdateMilestoneInput } from '@/types'

interface MilestoneState {
  milestones: Milestone[]
  isLoading: boolean
  error: string | null

  fetchMilestones: (goalId?: string) => Promise<void>
  addMilestone: (input: CreateMilestoneInput) => Promise<Milestone>
  updateMilestone: (id: string, input: UpdateMilestoneInput) => Promise<Milestone>
  deleteMilestone: (id: string) => Promise<void>

  getMilestoneById: (id: string) => Milestone | undefined
  getMilestonesByGoal: (goalId: string) => Milestone[]
  clearError: () => void
}

export const useMilestoneStore = create<MilestoneState>((set, get) => ({
  milestones: [],
  isLoading: false,
  error: null,

  fetchMilestones: async (goalId) => {
    set({ isLoading: true, error: null })
    try {
      const milestones = await milestonesApi.list({ goalId })
      set({ milestones, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  addMilestone: async (input) => {
    const milestone = await milestonesApi.create(input)
    set((state) => ({ milestones: [...state.milestones, milestone] }))
    return milestone
  },

  updateMilestone: async (id, input) => {
    const milestone = await milestonesApi.update(id, input)
    set((state) => ({
      milestones: state.milestones.map((m) => (m.id === id ? milestone : m)),
    }))
    return milestone
  },

  deleteMilestone: async (id) => {
    await milestonesApi.delete(id)
    set((state) => ({
      milestones: state.milestones.filter((m) => m.id !== id),
    }))
  },

  getMilestoneById: (id) => get().milestones.find((m) => m.id === id),
  getMilestonesByGoal: (goalId) => get().milestones.filter((m) => m.goalId === goalId),
  clearError: () => set({ error: null }),
}))
```

**Step 3: Create useTagStore**

Create `src/stores/useTagStore.ts`:

```typescript
import { create } from 'zustand'
import { tagsApi } from '@/api/services/tasks'
import type { Tag, CreateTagInput, UpdateTagInput } from '@/types'

interface TagState {
  tags: Tag[]
  isLoading: boolean
  error: string | null

  fetchTags: () => Promise<void>
  addTag: (input: CreateTagInput) => Promise<Tag>
  updateTag: (id: string, input: UpdateTagInput) => Promise<Tag>
  deleteTag: (id: string) => Promise<void>

  getTagById: (id: string) => Tag | undefined
  clearError: () => void
}

export const useTagStore = create<TagState>((set, get) => ({
  tags: [],
  isLoading: false,
  error: null,

  fetchTags: async () => {
    set({ isLoading: true, error: null })
    try {
      const tags = await tagsApi.list()
      set({ tags, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  addTag: async (input) => {
    const tag = await tagsApi.create(input)
    set((state) => ({ tags: [...state.tags, tag] }))
    return tag
  },

  updateTag: async (id, input) => {
    const tag = await tagsApi.update(id, input)
    set((state) => ({
      tags: state.tags.map((t) => (t.id === id ? tag : t)),
    }))
    return tag
  },

  deleteTag: async (id) => {
    await tagsApi.delete(id)
    set((state) => ({
      tags: state.tags.filter((t) => t.id !== id),
    }))
  },

  getTagById: (id) => get().tags.find((t) => t.id === id),
  clearError: () => set({ error: null }),
}))
```

**Step 4: Simplify useTaskStore to only handle tasks**

Modify `src/stores/useTaskStore.ts` to remove goals/milestones/tags:

```typescript
import { create } from 'zustand'
import { tasksApi } from '@/api/services/tasks'
import type { Task, CreateTaskInput, UpdateTaskInput, TaskFilter } from '@/types'

interface TaskState {
  tasks: Task[]
  isLoading: boolean
  error: string | null

  fetchTasks: (filter?: TaskFilter) => Promise<void>
  addTask: (input: CreateTaskInput) => Promise<Task>
  updateTask: (id: string, input: UpdateTaskInput) => Promise<Task>
  deleteTask: (id: string) => Promise<void>
  toggleTaskComplete: (id: string) => Promise<Task>

  getTaskById: (id: string) => Task | undefined
  getTasksByMilestone: (milestoneId: string) => Task[]
  getChildTasks: (parentId: string) => Task[]
  clearError: () => void
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,

  fetchTasks: async (filter) => {
    set({ isLoading: true, error: null })
    try {
      const tasks = await tasksApi.list(filter)
      set({ tasks, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  addTask: async (input) => {
    const task = await tasksApi.create(input)
    set((state) => ({ tasks: [...state.tasks, task] }))
    return task
  },

  updateTask: async (id, input) => {
    const task = await tasksApi.update(id, input)
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? task : t)),
    }))
    return task
  },

  deleteTask: async (id) => {
    await tasksApi.delete(id)
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }))
  },

  toggleTaskComplete: async (id) => {
    const task = await tasksApi.toggleComplete(id)
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? task : t)),
    }))
    return task
  },

  getTaskById: (id) => get().tasks.find((t) => t.id === id),
  getTasksByMilestone: (milestoneId) =>
    get().tasks.filter((t) => t.milestoneId === milestoneId),
  getChildTasks: (parentId) =>
    get().tasks.filter((t) => t.parentTaskId === parentId),
  clearError: () => set({ error: null }),
}))
```

**Step 5: Create combined hook for backward compatibility**

Create `src/stores/useTaskManagerStore.ts`:

```typescript
import { useGoalStore } from './useGoalStore'
import { useMilestoneStore } from './useMilestoneStore'
import { useTagStore } from './useTagStore'
import { useTaskStore } from './useTaskStore'

/**
 * Combined hook for components that need all task-related stores.
 * Provides backward compatibility during migration.
 */
export function useTaskManagerStore() {
  const goalStore = useGoalStore()
  const milestoneStore = useMilestoneStore()
  const tagStore = useTagStore()
  const taskStore = useTaskStore()

  return {
    // Goals
    goals: goalStore.goals,
    fetchGoals: goalStore.fetchGoals,
    addGoal: goalStore.addGoal,
    updateGoal: goalStore.updateGoal,
    deleteGoal: goalStore.deleteGoal,
    getGoalById: goalStore.getGoalById,

    // Milestones
    milestones: milestoneStore.milestones,
    fetchMilestones: milestoneStore.fetchMilestones,
    addMilestone: milestoneStore.addMilestone,
    updateMilestone: milestoneStore.updateMilestone,
    deleteMilestone: milestoneStore.deleteMilestone,
    getMilestoneById: milestoneStore.getMilestoneById,
    getMilestonesByGoal: milestoneStore.getMilestonesByGoal,

    // Tags
    tags: tagStore.tags,
    fetchTags: tagStore.fetchTags,
    addTag: tagStore.addTag,
    updateTag: tagStore.updateTag,
    deleteTag: tagStore.deleteTag,
    getTagById: tagStore.getTagById,

    // Tasks
    tasks: taskStore.tasks,
    fetchTasks: taskStore.fetchTasks,
    addTask: taskStore.addTask,
    updateTask: taskStore.updateTask,
    deleteTask: taskStore.deleteTask,
    toggleTaskComplete: taskStore.toggleTaskComplete,
    getTaskById: taskStore.getTaskById,
    getTasksByMilestone: taskStore.getTasksByMilestone,
    getChildTasks: taskStore.getChildTasks,

    // Combined loading state
    isLoading:
      goalStore.isLoading ||
      milestoneStore.isLoading ||
      tagStore.isLoading ||
      taskStore.isLoading,

    // Fetch all
    fetchAll: async () => {
      await Promise.all([
        goalStore.fetchGoals(),
        milestoneStore.fetchMilestones(),
        tagStore.fetchTags(),
        taskStore.fetchTasks(),
      ])
    },
  }
}
```

**Step 6: Run TypeScript check**

Run: `cd /home/yu-min/Repositories/kensan-mockup && npm run build`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add src/stores/useGoalStore.ts src/stores/useMilestoneStore.ts src/stores/useTagStore.ts src/stores/useTaskStore.ts src/stores/useTaskManagerStore.ts
git commit -m "refactor(frontend): split useTaskStore into domain stores

- Create useGoalStore for goals
- Create useMilestoneStore for milestones
- Create useTagStore for tags
- Simplify useTaskStore to tasks only
- Add useTaskManagerStore for backward compat"
```

---

### Task 13: Update Components to Use New Stores

**Goal:** Migrate components from old useTaskStore to new domain stores.

**Files:**
- Modify: `src/pages/T01_TaskManagement.tsx`
- Modify: `src/components/task/TaskDialog.tsx`
- Modify: `src/components/common/TaskSelect.tsx`
- Modify: `src/hooks/useInitializeData.ts`

**Step 1: Update T01_TaskManagement.tsx**

```typescript
import { useGoalStore } from '@/stores/useGoalStore'
import { useMilestoneStore } from '@/stores/useMilestoneStore'
import { useTagStore } from '@/stores/useTagStore'
import { useTaskStore } from '@/stores/useTaskStore'

export function T01_TaskManagement() {
  const { goals, fetchGoals, addGoal, updateGoal, deleteGoal } = useGoalStore()
  const { milestones, fetchMilestones, getMilestonesByGoal } = useMilestoneStore()
  const { tags, fetchTags } = useTagStore()
  const { tasks, fetchTasks, getTasksByMilestone } = useTaskStore()

  // ... rest of component
}
```

**Step 2: Update TaskDialog.tsx**

```typescript
import { useGoalStore } from '@/stores/useGoalStore'
import { useMilestoneStore } from '@/stores/useMilestoneStore'
import { useTagStore } from '@/stores/useTagStore'
import { useTaskStore } from '@/stores/useTaskStore'

export function TaskDialog({ ... }) {
  const goals = useGoalStore((state) => state.goals)
  const milestones = useMilestoneStore((state) => state.milestones)
  const tags = useTagStore((state) => state.tags)
  const addTask = useTaskStore((state) => state.addTask)
  // ...
}
```

**Step 3: Update useInitializeData.ts**

```typescript
import { useGoalStore } from '@/stores/useGoalStore'
import { useMilestoneStore } from '@/stores/useMilestoneStore'
import { useTagStore } from '@/stores/useTagStore'
import { useTaskStore } from '@/stores/useTaskStore'

export function useInitializeData() {
  const fetchGoals = useGoalStore((state) => state.fetchGoals)
  const fetchMilestones = useMilestoneStore((state) => state.fetchMilestones)
  const fetchTags = useTagStore((state) => state.fetchTags)
  const fetchTasks = useTaskStore((state) => state.fetchTasks)

  // ... update useEffect to call new stores
}
```

**Step 4: Run TypeScript check**

Run: `cd /home/yu-min/Repositories/kensan-mockup && npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/pages/T01_TaskManagement.tsx src/components/task/TaskDialog.tsx src/components/common/TaskSelect.tsx src/hooks/useInitializeData.ts
git commit -m "refactor(frontend): migrate components to new domain stores

- Update T01_TaskManagement to use separate stores
- Update TaskDialog to use separate stores
- Update useInitializeData hook"
```

---

### Task 14: Extract Reorder Utility

**Goal:** Remove duplicated reorder logic.

**Files:**
- Create: `src/lib/arrayUtils.ts`
- Modify: `src/stores/useDashboardStore.ts`

**Step 1: Create array utilities**

Create `src/lib/arrayUtils.ts`:

```typescript
/**
 * Reorder items in an array by moving item from one index to another.
 */
export function reorderByIndex<T>(
  items: T[],
  fromIndex: number,
  toIndex: number
): T[] {
  const result = [...items]
  const [removed] = result.splice(fromIndex, 1)
  result.splice(toIndex, 0, removed)
  return result
}

/**
 * Reorder items according to a new order of IDs.
 */
export function reorderByIds<T extends { id: string }>(
  items: T[],
  newOrder: string[]
): T[] {
  const itemMap = new Map(items.map((item) => [item.id, item]))
  return newOrder
    .map((id) => itemMap.get(id))
    .filter((item): item is T => item !== undefined)
}

/**
 * Move an item to a new position by ID.
 */
export function moveItemById<T extends { id: string }>(
  items: T[],
  itemId: string,
  toIndex: number
): T[] {
  const fromIndex = items.findIndex((item) => item.id === itemId)
  if (fromIndex === -1) return items
  return reorderByIndex(items, fromIndex, toIndex)
}
```

**Step 2: Update useDashboardStore to use utility**

Modify `src/stores/useDashboardStore.ts`:

```typescript
import { reorderByIndex } from '@/lib/arrayUtils'

// Replace inline reorder logic with:
reorderPinnedReminders: (fromIndex, toIndex) =>
  set((state) => ({
    pinnedReminders: reorderByIndex(state.pinnedReminders, fromIndex, toIndex),
  })),

reorderStickyNotes: (fromIndex, toIndex) =>
  set((state) => ({
    stickyNotes: reorderByIndex(state.stickyNotes, fromIndex, toIndex),
  })),
```

**Step 3: Run TypeScript check**

Run: `cd /home/yu-min/Repositories/kensan-mockup && npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/lib/arrayUtils.ts src/stores/useDashboardStore.ts
git commit -m "refactor(frontend): extract reorder utility

- Create lib/arrayUtils.ts with reorderByIndex, reorderByIds
- Remove duplicated reorder logic from useDashboardStore"
```

---

### Task 15: Split TimeBlockTimeline Component

**Goal:** Break down 900-line component into manageable pieces.

**Files:**
- Create: `src/components/common/timeline/TimeBlockTimelineGrid.tsx`
- Create: `src/components/common/timeline/TimeBlockItem.tsx`
- Create: `src/components/common/timeline/TimeBlockDropIndicator.tsx`
- Create: `src/components/common/timeline/useTimeBlockDragResize.ts`
- Modify: `src/components/common/TimeBlockTimeline.tsx`

**Step 1: Create TimeBlockTimelineGrid**

Create `src/components/common/timeline/TimeBlockTimelineGrid.tsx`:

```typescript
import { cn } from '@/lib/utils'

interface TimeBlockTimelineGridProps {
  startHour: number
  endHour: number
  hourHeight: number
  className?: string
}

export function TimeBlockTimelineGrid({
  startHour,
  endHour,
  hourHeight,
  className,
}: TimeBlockTimelineGridProps) {
  const hours = Array.from(
    { length: endHour - startHour },
    (_, i) => startHour + i
  )

  return (
    <div className={cn('relative', className)}>
      {hours.map((hour) => (
        <div
          key={hour}
          className="flex border-t border-border/30"
          style={{ height: hourHeight }}
        >
          <div className="w-12 pr-2 text-right text-xs text-muted-foreground">
            {hour.toString().padStart(2, '0')}:00
          </div>
          <div className="flex-1 relative">
            {/* Half-hour line */}
            <div
              className="absolute w-full border-t border-dashed border-border/20"
              style={{ top: hourHeight / 2 }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
```

**Step 2: Create TimeBlockItem**

Create `src/components/common/timeline/TimeBlockItem.tsx`:

```typescript
import { cn } from '@/lib/utils'
import type { TimeBlock, TimeEntry } from '@/types'

interface TimeBlockItemProps {
  block: TimeBlock | TimeEntry
  type: 'plan' | 'entry'
  style: React.CSSProperties
  isResizing: boolean
  isDragging: boolean
  onResizeStart: (edge: 'top' | 'bottom', e: React.MouseEvent) => void
  onDragStart: (e: React.MouseEvent) => void
  onClick: () => void
}

export function TimeBlockItem({
  block,
  type,
  style,
  isResizing,
  isDragging,
  onResizeStart,
  onDragStart,
  onClick,
}: TimeBlockItemProps) {
  const hasGoal = !!block.goalId

  return (
    <div
      className={cn(
        'absolute left-12 right-0 rounded-md cursor-pointer transition-shadow',
        'hover:shadow-md',
        type === 'plan'
          ? 'bg-[var(--timeblock-plan-bg)]'
          : 'bg-[var(--timeblock-actual-bg)]',
        hasGoal ? 'border-l-4' : 'border border-dashed border-muted-foreground/50',
        (isResizing || isDragging) && 'shadow-lg z-10'
      )}
      style={{
        ...style,
        borderLeftColor: hasGoal ? block.goalColor : undefined,
        backgroundColor: hasGoal
          ? `${block.goalColor}15`
          : undefined,
      }}
      onClick={onClick}
      onMouseDown={onDragStart}
    >
      {/* Resize handles */}
      <div
        className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize"
        onMouseDown={(e) => {
          e.stopPropagation()
          onResizeStart('top', e)
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize"
        onMouseDown={(e) => {
          e.stopPropagation()
          onResizeStart('bottom', e)
        }}
      />

      {/* Content */}
      <div className="px-2 py-1 overflow-hidden">
        <div className="text-sm font-medium truncate">{block.taskName}</div>
        {hasGoal && block.goalName && (
          <div className="text-xs text-muted-foreground truncate">
            {block.goalName}
          </div>
        )}
        {!hasGoal && (
          <div className="text-xs text-muted-foreground">その他</div>
        )}
      </div>
    </div>
  )
}
```

**Step 3: Create useTimeBlockDragResize hook**

Create `src/components/common/timeline/useTimeBlockDragResize.ts`:

```typescript
import { useState, useCallback, useEffect } from 'react'

interface DragResizeState {
  blockId: string | null
  type: 'drag' | 'resize-top' | 'resize-bottom' | null
  startY: number
  startTop: number
  startHeight: number
}

interface UseTimeBlockDragResizeOptions {
  hourHeight: number
  snapMinutes: number
  onDragEnd: (blockId: string, newTop: number) => void
  onResizeEnd: (blockId: string, newTop: number, newHeight: number) => void
}

export function useTimeBlockDragResize({
  hourHeight,
  snapMinutes,
  onDragEnd,
  onResizeEnd,
}: UseTimeBlockDragResizeOptions) {
  const [state, setState] = useState<DragResizeState>({
    blockId: null,
    type: null,
    startY: 0,
    startTop: 0,
    startHeight: 0,
  })
  const [preview, setPreview] = useState<{ top: number; height: number } | null>(
    null
  )

  const snapToGrid = useCallback(
    (pixels: number) => {
      const minutesPerPixel = 60 / hourHeight
      const totalMinutes = pixels * minutesPerPixel
      const snappedMinutes = Math.round(totalMinutes / snapMinutes) * snapMinutes
      return (snappedMinutes / 60) * hourHeight
    },
    [hourHeight, snapMinutes]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!state.blockId || !state.type) return

      const deltaY = e.clientY - state.startY

      if (state.type === 'drag') {
        const newTop = snapToGrid(state.startTop + deltaY)
        setPreview({ top: newTop, height: state.startHeight })
      } else if (state.type === 'resize-top') {
        const newTop = snapToGrid(state.startTop + deltaY)
        const newHeight = state.startHeight - (newTop - state.startTop)
        if (newHeight > hourHeight / 4) {
          setPreview({ top: newTop, height: newHeight })
        }
      } else if (state.type === 'resize-bottom') {
        const newHeight = snapToGrid(state.startHeight + deltaY)
        if (newHeight > hourHeight / 4) {
          setPreview({ top: state.startTop, height: newHeight })
        }
      }
    },
    [state, snapToGrid, hourHeight]
  )

  const handleMouseUp = useCallback(() => {
    if (!state.blockId || !preview) {
      setState({ blockId: null, type: null, startY: 0, startTop: 0, startHeight: 0 })
      setPreview(null)
      return
    }

    if (state.type === 'drag') {
      onDragEnd(state.blockId, preview.top)
    } else {
      onResizeEnd(state.blockId, preview.top, preview.height)
    }

    setState({ blockId: null, type: null, startY: 0, startTop: 0, startHeight: 0 })
    setPreview(null)
  }, [state, preview, onDragEnd, onResizeEnd])

  useEffect(() => {
    if (state.blockId) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [state.blockId, handleMouseMove, handleMouseUp])

  const startDrag = useCallback(
    (blockId: string, top: number, height: number, e: React.MouseEvent) => {
      e.preventDefault()
      setState({
        blockId,
        type: 'drag',
        startY: e.clientY,
        startTop: top,
        startHeight: height,
      })
    },
    []
  )

  const startResize = useCallback(
    (
      blockId: string,
      edge: 'top' | 'bottom',
      top: number,
      height: number,
      e: React.MouseEvent
    ) => {
      e.preventDefault()
      setState({
        blockId,
        type: edge === 'top' ? 'resize-top' : 'resize-bottom',
        startY: e.clientY,
        startTop: top,
        startHeight: height,
      })
    },
    []
  )

  return {
    activeBlockId: state.blockId,
    activeType: state.type,
    preview,
    startDrag,
    startResize,
  }
}
```

**Step 4: Refactor TimeBlockTimeline to use extracted components**

Modify `src/components/common/TimeBlockTimeline.tsx` to import and use the new components:

```typescript
import { TimeBlockTimelineGrid } from './timeline/TimeBlockTimelineGrid'
import { TimeBlockItem } from './timeline/TimeBlockItem'
import { useTimeBlockDragResize } from './timeline/useTimeBlockDragResize'

// Significantly simplified main component using extracted pieces
```

**Step 5: Run TypeScript check**

Run: `cd /home/yu-min/Repositories/kensan-mockup && npm run build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/components/common/timeline/
git add src/components/common/TimeBlockTimeline.tsx
git commit -m "refactor(frontend): split TimeBlockTimeline into subcomponents

- Extract TimeBlockTimelineGrid for hour labels and gridlines
- Extract TimeBlockItem for individual block rendering
- Extract useTimeBlockDragResize hook for drag/resize logic
- Reduce main component from 900 lines to ~200 lines"
```

---

## Phase 4: Documentation Update

### Task 16: Update Architecture Documentation

**Goal:** Reflect refactoring changes in architecture docs.

**Files:**
- Modify: `backend/ARCHITECTURE.md`
- Modify: `src/ARCHITECTURE.md`
- Modify: `kensan-ai/ARCHITECTURE.md`

**Step 1: Update Backend ARCHITECTURE.md**

Add section on service interfaces and segregated repositories.

**Step 2: Update Frontend ARCHITECTURE.md**

Update stores section to reflect new domain stores.

**Step 3: Update AI ARCHITECTURE.md**

Document new error handling and MessageHistory class.

**Step 4: Commit**

```bash
git add backend/ARCHITECTURE.md src/ARCHITECTURE.md kensan-ai/ARCHITECTURE.md
git commit -m "docs: update architecture documentation

- Document service interfaces (DIP) in backend
- Document segregated repository interfaces (ISP)
- Document domain stores in frontend
- Document error handling in AI service"
```

---

## Final Task: Integration Testing

### Task 17: Verify All Services Work Together

**Goal:** Ensure refactoring didn't break functionality.

**Step 1: Start all services**

Run: `cd /home/yu-min/Repositories/kensan-mockup && make up`
Expected: All services start successfully

**Step 2: Run backend tests**

Run: `cd /home/yu-min/Repositories/kensan-mockup/backend && make test`
Expected: All tests pass

**Step 3: Run frontend build**

Run: `cd /home/yu-min/Repositories/kensan-mockup && npm run build`
Expected: Build succeeds with no TypeScript errors

**Step 4: Run AI service**

Run: `cd /home/yu-min/Repositories/kensan-mockup/kensan-ai && pytest -v`
Expected: All tests pass

**Step 5: Manual smoke test**

1. Open http://localhost:5173
2. Login with test user
3. Navigate to Tasks page - verify goals/milestones/tasks load
4. Navigate to Daily page - verify timeline works
5. Create a time block - verify save works

**Step 6: Final commit**

```bash
git add -A
git commit -m "chore: complete architecture refactoring

All SOLID principles applied:
- SRP: Split large components and stores
- OCP: Maintained extension points
- LSP: N/A (minimal inheritance)
- ISP: Segregated repository interfaces
- DIP: Service interfaces for handlers

Technical debt reduced across all codebases."
```

---

## Summary

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1: Backend | 1-6 | 8-10 hours |
| Phase 2: AI | 7-11 | 6-8 hours |
| Phase 3: Frontend | 12-15 | 6-8 hours |
| Phase 4: Docs | 16 | 1-2 hours |
| Final: Testing | 17 | 1-2 hours |
| **Total** | **17 tasks** | **22-30 hours** |

---

## Execution Notes

- Tasks are independent within each phase
- Phases should be executed in order (Backend → AI → Frontend)
- Commit after each task for easy rollback
- Run tests after each significant change
