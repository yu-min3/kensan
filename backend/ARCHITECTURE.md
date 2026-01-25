# Backend Architecture

Go microservices for the Kensan personal productivity application.

---

## Table of Contents

1. [Overview](#overview)
2. [Services](#services)
3. [Shared Infrastructure](#shared-infrastructure)
4. [Layered Architecture](#layered-architecture)
5. [Database Schema](#database-schema)
6. [API Reference](#api-reference)
7. [Authentication Flow](#authentication-flow)
8. [Key Patterns](#key-patterns)
9. [Development](#development)

---

## Overview

### Architecture Style
- **9 independent Go microservices** on ports 8081-8091
- Single PostgreSQL 16 database (shared schema)
- JWT-based authentication (HS256)
- Multi-tenant: every table has `user_id` for complete data isolation

### Tech Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Language | Go | 1.24.0 |
| HTTP Router | chi | v5.1.0 |
| Database | PostgreSQL | 16 |
| DB Driver | pgx | v5.7.2 |
| JWT | golang-jwt | v5.2.1 |
| Logging | zerolog | v1.33.0 |
| UUID | google/uuid | v1.6.0 |

---

## Services

| Service | Port | Domain | Key Entities |
|---------|------|--------|--------------|
| user-service | 8081 | Auth, Settings | users, user_settings |
| task-service | 8082 | Goals, Tasks | goals, milestones, tags, tasks |
| timeblock-service | 8084 | Time Planning | time_blocks, time_entries, running_timers |
| routine-service | 8085 | Routines | routine_tasks |
| record-service | 8086 | Learning | learning_records |
| diary-service | 8087 | Diary | diary_entries |
| analytics-service | 8088 | Analytics | ai_review_reports (reads aggregates) |
| memo-service | 8090 | Quick Notes | memos |
| note-service | 8091 | Unified Notes | notes (diary + learning unified) |

### Service Directory Structure

Each service follows identical structure:

```
services/<name>/
├── cmd/main.go                    # Entry point, dependency setup
├── internal/
│   ├── model.go                   # Domain types & DTOs
│   ├── handler/handler.go         # HTTP handlers
│   ├── service/service.go         # Business logic
│   ├── service/service_test.go    # Unit tests
│   └── repository/
│       ├── interface.go           # Repository contract
│       └── repository.go          # PostgreSQL implementation
├── Dockerfile
└── Makefile
```

---

## Shared Infrastructure

Located in `backend/shared/`:

### Bootstrap (`bootstrap/bootstrap.go`)

Service initialization with batteries included:

```go
svc := bootstrap.New("user-service")

// Register protected routes (auth required)
svc.RegisterRoutes(func(r chi.Router) {
    r.Get("/users/me", handler.GetProfile)
})

// Register public routes (no auth)
svc.RegisterPublicRoutes(func(r chi.Router) {
    r.Post("/auth/login", handler.Login)
})

svc.Run()
```

**Provides:**
- Configuration loading from environment
- Database connection pooling (pgxpool)
- JWT manager setup
- Middleware chain (RequestID, Logger, CORS, Auth)
- Graceful shutdown
- `/health` endpoint

### Configuration (`config/config.go`)

Environment-based configuration:

```go
type Config struct {
    Server   ServerConfig   // Host, Port, Env
    Database DatabaseConfig // Host, Port, User, Password, DBName, SSLMode
    JWT      JWTConfig      // Secret, Issuer, ExpireHour
}
```

### Authentication (`auth/jwt.go`)

JWT token management:

```go
jwtManager := auth.NewJWTManager(secret, issuer, expireHours)

// Generate token
token, err := jwtManager.GenerateToken(userID, email)

// Validate token
claims, err := jwtManager.ValidateToken(tokenString)
```

**Claims structure:**
- UserID, Email
- IssuedAt, ExpiresAt (24h default)
- Issuer: "kensan"

### Middleware (`middleware/`)

**Request Processing:**
- `RequestID` - UUID per request (or from X-Request-ID header)
- `Logger` - Structured logging with zerolog
- `Auth` - JWT validation, user ID extraction

**Response Helpers:**
```go
middleware.JSON(w, r, http.StatusOK, data)
middleware.JSONWithPagination(w, r, status, data, pagination)
middleware.Error(w, r, http.StatusNotFound, "NOT_FOUND", "Resource not found")
middleware.ValidationError(w, r, []ErrorDetail{{Field: "email", Message: "required"}})
middleware.HandleServiceError(w, r, err, errorMappings, defaultMsg)
```

**Response Envelope:**
```json
{
  "data": { ... },
  "meta": {
    "requestId": "uuid",
    "timestamp": "2026-01-23T..."
  },
  "pagination": { "page": 1, "perPage": 20, "total": 100 }
}
```

### Error Handling (`errors/errors.go`)

Sentinel errors with wrapping:

```go
// Base errors
errors.ErrNotFound, ErrInvalidInput, ErrUnauthorized, ErrAlreadyExists

// Entity-specific
errors.NotFound("task")     // → "task not found"
errors.Required("email")    // → "email is required"

// Type checking
if errors.IsNotFound(err) { ... }
```

### Custom Types (`types/date.go`)

**DateOnly** - PostgreSQL DATE without time:

```go
type DateOnly struct {
    Time  time.Time
    Valid bool
}

// Implements: sql.Scanner, driver.Valuer, json.Marshaler/Unmarshaler
// JSON: "2026-01-23" or null
```

---

## Layered Architecture

### Flow

```
HTTP Request
    ↓
Handler (HTTP layer)
    - Extract user ID from context
    - Parse request body/params
    - Validate input
    - Call service
    - Map errors to HTTP status
    - Return JSON response
    ↓
Service (Business logic)
    - Domain validation
    - Business rules
    - Orchestration
    - Returns domain errors
    ↓
Repository (Data access)
    - SQL queries (pgx)
    - Row scanning
    - Returns ErrNotFound for missing rows
    ↓
PostgreSQL
```

### Handler Pattern

```go
func (h *Handler) GetTask(w http.ResponseWriter, r *http.Request) {
    userID := middleware.GetUserID(r.Context())
    taskID := chi.URLParam(r, "taskId")

    task, err := h.service.GetByID(r.Context(), userID, taskID)
    if err != nil {
        switch {
        case errors.Is(err, service.ErrTaskNotFound):
            middleware.Error(w, r, http.StatusNotFound, "NOT_FOUND", "Task not found")
        default:
            middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL", "...")
        }
        return
    }

    middleware.JSON(w, r, http.StatusOK, task)
}
```

### Repository Pattern

```go
// Interface (internal/repository/interface.go)
type Repository interface {
    GetByID(ctx context.Context, id string) (*Entity, error)
    GetByIDAndUserID(ctx context.Context, id, userID string) (*Entity, error)
    Create(ctx context.Context, entity *Entity) error
    Update(ctx context.Context, entity *Entity) error
    Delete(ctx context.Context, id string) error
    List(ctx context.Context, userID string, filter *Filter) ([]*Entity, error)
}

// Implementation (internal/repository/repository.go)
func (r *PostgresRepository) GetByIDAndUserID(ctx context.Context, id, userID string) (*Entity, error) {
    row := r.pool.QueryRow(ctx, `SELECT ... FROM entities WHERE id = $1 AND user_id = $2`, id, userID)

    var e Entity
    if err := row.Scan(&e.ID, &e.Name, ...); err != nil {
        if errors.Is(err, pgx.ErrNoRows) {
            return nil, ErrNotFound
        }
        return nil, err
    }
    return &e, nil
}
```

---

## Database Schema

### Core Tables

**users**
```sql
id UUID PRIMARY KEY
email VARCHAR(255) UNIQUE NOT NULL
password_hash VARCHAR(255) NOT NULL
name VARCHAR(255) NOT NULL
created_at, updated_at TIMESTAMP
```

**user_settings**
```sql
user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE
timezone VARCHAR(100) DEFAULT 'Asia/Tokyo'
theme VARCHAR(20) DEFAULT 'system'  -- light/dark/system
is_configured BOOLEAN DEFAULT false
ai_enabled, ai_consent_given BOOLEAN
ai_consented_at TIMESTAMP
```

**goals**
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES users(id)
name, description TEXT
color VARCHAR(7)  -- #RRGGBB
is_archived BOOLEAN DEFAULT false
```

**milestones**
```sql
id UUID PRIMARY KEY
user_id, goal_id UUID
name, description TEXT
target_date DATE
status VARCHAR(20)  -- active/completed/archived
```

**tasks**
```sql
id UUID PRIMARY KEY
user_id, milestone_id, parent_task_id UUID
name TEXT NOT NULL
estimated_minutes INTEGER
completed BOOLEAN DEFAULT false
due_date DATE
-- Supports subtasks via parent_task_id self-reference
```

**task_tags** (junction table)
```sql
task_id, tag_id UUID
PRIMARY KEY (task_id, tag_id)
```

### Time Tracking Tables

**time_blocks** (計画)
```sql
id UUID PRIMARY KEY
user_id UUID
date DATE, start_time TIME, end_time TIME
task_name TEXT
-- Denormalized: task_id, milestone_id, milestone_name, goal_id, goal_name, goal_color
tag_ids UUID[]
is_routine BOOLEAN, routine_task_id UUID
```

**time_entries** (実績)
```sql
-- Same as time_blocks plus:
description TEXT
```

**running_timers**
```sql
user_id UUID UNIQUE  -- one active timer per user
started_at TIMESTAMP
task_name, goal_name, goal_color, ...
```

### Content Tables

**notes** (unified diary + learning)
```sql
id UUID PRIMARY KEY
user_id UUID
type VARCHAR(20)    -- diary/learning
format VARCHAR(20)  -- markdown/drawio
title, content TEXT
date DATE           -- for diary type
archived BOOLEAN
-- Denormalized goal/milestone info
tag_ids UUID[], related_time_entry_ids UUID[]
file_url TEXT
```

### Indexes & Constraints

- Foreign keys with `ON DELETE CASCADE` where appropriate
- Composite indexes: `(user_id, date)`, `(user_id, status)`
- GIN indexes on array columns (tag_ids, tags)
- Full-text search index: `to_tsvector('simple', title || ' ' || content)`
- Unique constraints: `(user_id, email)`, `(user_id, date)` for diary

### Auto-updated Timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_timestamp
    BEFORE UPDATE ON <table>
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## API Reference

### User Service (8081)

**Public:**
```
POST /api/v1/auth/register
  Body: { email, password, name }
  Response: { token, user }

POST /api/v1/auth/login
  Body: { email, password }
  Response: { token, user }
```

**Protected:**
```
GET    /api/v1/users/me           → User profile
PUT    /api/v1/users/me           → Update profile
GET    /api/v1/users/me/settings  → User settings
PUT    /api/v1/users/me/settings  → Update settings
POST   /api/v1/users/me/ai-consent → Record AI consent
```

### Task Service (8082)

```
GET|POST        /api/v1/goals
GET|PUT|DELETE  /api/v1/goals/{goalId}

GET|POST        /api/v1/milestones      ?goal_id=&status=
GET|PUT|DELETE  /api/v1/milestones/{id}

GET|POST        /api/v1/tags
GET|PUT|DELETE  /api/v1/tags/{id}

GET|POST        /api/v1/tasks           ?milestone_id=&completed=&parent_id=
GET|PUT|DELETE  /api/v1/tasks/{id}
PATCH           /api/v1/tasks/{id}/complete
```

### Timeblock Service (8084)

```
GET|POST        /api/v1/timeblocks      ?date=&start_date=&end_date=&start_timestamp=&end_timestamp=
PUT|DELETE      /api/v1/timeblocks/{id}
POST            /api/v1/timeblocks/generate-from-routines

GET|POST        /api/v1/time-entries    ?date=&start_date=&end_date=&start_timestamp=&end_timestamp=
PUT|DELETE      /api/v1/time-entries/{id}

GET             /api/v1/timer/current
POST            /api/v1/timer/start
POST            /api/v1/timer/stop
```

**Timezone handling:** UTC timestamp filters take precedence over date filters.

### Note Service (8091)

```
GET|POST        /api/v1/notes           ?types[]=diary&goalId=&archived=
GET|PUT|DELETE  /api/v1/notes/{id}
GET             /api/v1/notes/search    ?query=&types[]=&archived=
POST            /api/v1/notes/{id}/archive
```

---

## Authentication Flow

### Registration
1. POST `/auth/register` with email, password, name
2. Validate email format, password length (≥8)
3. Check email uniqueness
4. Bcrypt hash password (cost 12)
5. Create user + default settings
6. Generate JWT token
7. Return `{ token, user }`

### Login
1. POST `/auth/login` with email, password
2. Find user by email (case-insensitive)
3. Bcrypt compare password
4. Generate JWT token
5. Return `{ token, user }`

### Protected Requests
1. Client sends `Authorization: Bearer <token>`
2. Auth middleware validates token signature
3. Extracts claims, adds userID to context
4. Handler retrieves: `userID := middleware.GetUserID(r.Context())`
5. All queries filter by user_id

---

## Key Patterns

### Multi-tenancy
Every query includes `WHERE user_id = $1`:
```go
query := `SELECT * FROM tasks WHERE user_id = $1 AND id = $2`
```

### Denormalization
TimeBlocks, TimeEntries, Notes store goal/milestone info directly:
- `goal_id`, `goal_name`, `goal_color`
- `milestone_id`, `milestone_name`

**Rationale:** Avoid joins for list queries. Display data survives goal/milestone updates.

### Optional Field Updates
Use pointers to distinguish "not provided" from "set to null":
```go
type UpdateInput struct {
    Name  *string `json:"name,omitempty"`
    Theme *string `json:"theme,omitempty"`
}

// In service:
if input.Name != nil {
    entity.Name = *input.Name
}
```

### Error Mapping
```go
func handleError(w http.ResponseWriter, r *http.Request, err error) {
    switch {
    case errors.Is(err, service.ErrNotFound):
        middleware.Error(w, r, http.StatusNotFound, "NOT_FOUND", "...")
    case errors.Is(err, service.ErrInvalidInput):
        middleware.Error(w, r, http.StatusBadRequest, "INVALID_INPUT", "...")
    default:
        middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL", "...")
    }
}
```

### Context Propagation
```go
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    userID := middleware.GetUserID(ctx)

    entity, err := h.service.Create(ctx, userID, input)
    // ctx carries request ID, timeout, cancellation
}
```

---

## Development

### Commands

```bash
cd backend

# Build all services
make build

# Run specific service
make run SERVICE=user-service

# Run tests
make test

# Lint
make lint

# Format
make fmt
```

### Docker

```bash
# From project root
make up          # Start all services
make down        # Stop all services
make logs        # View logs
make rebuild     # Rebuild and restart
```

### Environment Variables

```bash
SERVER_PORT=8081
SERVER_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USER=kensan
DB_PASSWORD=kensan
DB_NAME=kensan
JWT_SECRET=your-secret-key
```

### Adding a New Service

1. Create `services/<name>/` with standard structure
2. Define models in `internal/model.go`
3. Implement repository interface and PostgreSQL impl
4. Implement service layer with business logic
5. Implement HTTP handlers
6. Wire in `cmd/main.go` using bootstrap
7. Add Dockerfile
8. Add to docker-compose.yml
9. Create database migration if needed

---

## Dependencies

```
github.com/go-chi/chi/v5       v5.1.0
github.com/go-chi/cors         v1.2.1
github.com/golang-jwt/jwt/v5   v5.2.1
github.com/google/uuid         v1.6.0
github.com/jackc/pgx/v5        v5.7.2
github.com/rs/zerolog          v1.33.0
golang.org/x/crypto            v0.43.0
```
