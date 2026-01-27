# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **作業前に必ず読むこと**: 各コードベースの詳細なアーキテクチャドキュメントがあります。
> - `backend/ARCHITECTURE.md` - Goマイクロサービス
> - `src/ARCHITECTURE.md` - React/TypeScriptフロントエンド
> - `kensan-ai/ARCHITECTURE.md` - Python AIサービス
>
> **コード変更後は対応するドキュメントも更新すること。**

---

## Project Overview

Kensan is a personal productivity application for time tracking, task management, learning records, and AI-powered weekly reviews. It consists of a React/TypeScript frontend and Go microservices backend.

**Target User**: Engineers pursuing self-improvement goals (e.g., Golden Kubestronaut certification)

**Key Features**:
- Clockify integration for time tracking sync
- Morning planning / Evening reflection workflow
- Learning record management (Markdown/Drawio)
- AI-powered weekly reviews via Claude API
- Goal-based progress tracking (GK, OSS, Output, Other tags)

---

## Development Commands

### Frontend (React + Vite)
```bash
npm run dev      # Start development server on localhost:5173
npm run build    # TypeScript check + Vite production build
npm run lint     # ESLint
npm run preview  # Preview production build
```

### Backend (Go microservices)
```bash
cd backend
make build                    # Build all services to bin/
make run SERVICE=task-service # Build and run a specific service
make test                     # Run all tests
make lint                     # Run golangci-lint
make fmt                      # Format Go code
make deps                     # go mod download + tidy
```

### Docker (Full Stack)
```bash
make up           # Start all services (frontend + backend + postgres)
make down         # Stop all services
make logs         # View all service logs
make health       # Check health of all services
make dev-backend  # Start only backend services for local frontend dev
make clean        # Remove containers and volumes
```

### Testing
```bash
# Backend unit tests
cd backend && make test

# Backend e2e tests (requires running services)
cd backend && go test ./e2e/... -v
```

---

## Architecture

### Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend Framework | React | 18.x |
| Type System | TypeScript | 5.6 |
| Build Tool | Vite | 6.x |
| Styling | Tailwind CSS | 4.x |
| UI Components | shadcn/ui | - |
| State Management | Zustand | 5.x |
| Routing | React Router | 7.x |
| Backend | Go | 1.24.0 |
| HTTP Router | chi | v5 |
| Database | PostgreSQL | 16 |
| DB Driver | pgx | v5 |
| Logging | zerolog | - |

### Frontend Structure

```
src/
├── api/                    # HTTP client and service layer
│   ├── client.ts           # HttpClient class with auth token management
│   ├── config.ts           # Environment-based URL configuration
│   └── services/           # Per-domain API services
├── components/
│   ├── ui/                 # shadcn/ui primitives (Button, Card, Dialog, etc.)
│   ├── layout/             # Layout components (Header, Sidebar, Layout)
│   ├── common/             # Domain components (TagBadge, TaskCard, TimeBlockTimeline)
│   └── editor/             # Editor placeholders (Markdown, Drawio)
├── pages/                  # Page components with naming convention S*/M*/E*/L*/D*/T*/R*/A*
├── stores/                 # Zustand stores for state management
├── hooks/                  # Custom hooks (useInitializeData)
├── mocks/                  # MSW handlers and mock data
├── lib/                    # Utilities (timezone conversion, cn helper)
└── types/                  # TypeScript type definitions
```

### Backend Structure (Microservices)

Six Go services, each following identical layered architecture:

```
services/<name>/
├── cmd/main.go                    # Entry point, dependency setup
├── internal/
│   ├── model.go                   # Domain types
│   ├── handler/handler.go         # HTTP handlers
│   ├── service/service.go         # Business logic
│   ├── service/service_test.go    # Unit tests
│   └── repository/
│       ├── interface.go           # Repository interface
│       └── repository.go          # PostgreSQL implementation
├── Dockerfile
└── Makefile
```

### Services and Ports

| Service | Port | Domain | Key Responsibilities |
|---------|------|--------|---------------------|
| user-service | 8081 | Auth, Settings | Registration, login, JWT, user settings, AI consent |
| task-service | 8082 | Projects, Tasks | CRUD for projects/tasks, goal tags, hierarchy, recurring tasks via frequency |
| timeblock-service | 8084 | Time Planning | Time blocks (plans), time entries (actuals), timezone-aware queries |
| analytics-service | 8088 | Analytics | Weekly/monthly summaries, goal progress |
| memo-service | 8090 | Memo | Quick memos (scratch pad) |
| note-service | 8091 | Notes | Unified notes (diary + learning records) |

### Shared Backend Packages

Located in `backend/shared/`:

| Package | Purpose |
|---------|---------|
| `auth/jwt.go` | JWT token generation/validation (HS256) |
| `config/config.go` | Environment-based configuration loading |
| `database/postgres.go` | PostgreSQL connection pooling (pgxpool) |
| `middleware/middleware.go` | Request ID, auth validation, logging |
| `middleware/response.go` | Standardized JSON response formatting |

### Database Schema

PostgreSQL 16 with migrations in `backend/migrations/`. Key design decisions:

- **Multi-tenancy**: Every table has `user_id` column for complete data isolation
- **UUID Primary Keys**: Using PostgreSQL's uuid-ossp extension
- **Encrypted Storage**: Clockify API key encrypted via pgcrypto
- **Audit Trails**: Automatic `updated_at` via triggers
- **Denormalization**: `project_name`, `goal_tag` duplicated for query performance

**Core Tables**: users, user_settings, goals, milestones, tags, tasks, time_blocks, time_entries, routine_tasks, notes, memos, ai_review_reports, sync_status

---

## Key Patterns

### Frontend Data Flow

```
Component → Zustand Store → API Service → fetch() → Backend/MSW
                ↓
         State Update → Re-render
```

1. Pages import Zustand stores (e.g., `useTaskStore`)
2. Stores call API services in `src/api/services/`
3. API services use `httpClient` from `src/api/client.ts`
4. HttpClient automatically injects JWT Authorization header
5. In development, MSW can intercept requests (when enabled)

### MSW (Mock Service Worker) Configuration

MSW is **opt-in** via environment variable:

```bash
# Enable MSW for development
VITE_ENABLE_MSW=true npm run dev

# Disable MSW (use real backend)
npm run dev
```

When enabled, MSW intercepts fetch requests and returns mock responses from `src/mocks/handlers/`.

### Authentication Flow

1. **Login**: POST `/api/v1/auth/login` → Returns JWT token + user object
2. **Token Storage**: Zustand persist middleware stores token in localStorage
3. **Auto-restore**: On app load, token is restored and validated
4. **Protected Routes**: All API calls include `Authorization: Bearer <token>`
5. **User Extraction**: Backend extracts user ID from JWT via `middleware.GetUserID(r.Context())`

### Timezone Handling

The system stores all timestamps in UTC. Frontend converts local dates to UTC ranges for queries:

```typescript
// src/lib/timezone.ts
localDateToUtcRange('2026-01-21', 'Asia/Tokyo')
// → { startUtc: '2026-01-20T15:00:00.000Z', endUtc: '2026-01-21T15:00:00.000Z' }
```

Backend supports timestamp range queries:
```
GET /time-entries?start_timestamp=2026-01-20T15:00:00.000Z&end_timestamp=2026-01-21T15:00:00.000Z
```

### Page Naming Convention

Pages follow a prefix convention for easy navigation:
- `S` - Settings (S01_Settings)
- `D` - Daily (DailyPage - home page)
- `N` - Notes (N01_NoteList, N02_NoteEdit)
- `T` - Task (T01_TaskManagement)
- `A` - Analytics/AI (A01_AnalyticsReport, A02_AIReview)

### Backend Response Format

All API responses follow a consistent envelope:

```json
{
  "data": { /* entity or array */ },
  "meta": {
    "requestId": "uuid",
    "timestamp": "2026-01-21T..."
  },
  "pagination": { /* if applicable */ }
}
```

Error responses:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": [ /* validation errors */ ]
  },
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

---

## Environment Variables

### Frontend (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_USER_SERVICE_URL` | `http://localhost:8081` | User service URL |
| `VITE_TASK_SERVICE_URL` | `http://localhost:8082` | Task service URL |
| `VITE_SYNC_SERVICE_URL` | `http://localhost:8083` | Sync service URL |
| `VITE_TIMEBLOCK_SERVICE_URL` | `http://localhost:8084` | Timeblock service URL |
| `VITE_ROUTINE_SERVICE_URL` | `http://localhost:8085` | Routine service URL |
| `VITE_ANALYTICS_SERVICE_URL` | `http://localhost:8088` | Analytics service URL |
| `VITE_AI_SERVICE_URL` | `http://localhost:8089` | AI service URL |
| `VITE_MEMO_SERVICE_URL` | `http://localhost:8090` | Memo service URL |
| `VITE_NOTE_SERVICE_URL` | `http://localhost:8091` | Note service URL |
| `VITE_ENABLE_MSW` | `false` | Enable MSW mocking |

### Backend (via Docker or env)

| Variable | Description |
|----------|-------------|
| `SERVER_PORT` | Service port |
| `SERVER_ENV` | Environment (development/production) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | PostgreSQL connection |
| `JWT_SECRET` | JWT signing key |
| `ANTHROPIC_API_KEY` | For AI service (Claude API) |
| `CLOCKIFY_BASE_URL` | Clockify API base URL |
| `DB_ENCRYPTION_KEY` | Key for encrypting sensitive data |

---

## Test Data

### Test User

| Field | Value |
|-------|-------|
| Email | `test@kensan.dev` |
| Password | `password123` |
| Name | `Yu` |

### Seed Data (backend/migrations/002_seed.sql)

- **Projects**: Certification (GK), Kensan (OSS), ブログ執筆 (Output), 読書 (Other)
- **Tasks**: Hierarchical tasks under each project
- **Routine Tasks**: Daily (技術ニュースチェック, 英語学習), Custom (筋トレ), Weekly (週次振り返り)
- **Learning Records**: Istio, Kensan architecture, Cilium, Prometheus notes
- **Diary Entries**: Sample entries
- **AI Review Report**: Sample weekly review

---

## Adding New Features

### Adding a New Backend Service

1. Create directory structure under `backend/services/<name>/`
2. Define domain types in `internal/model.go`
3. Create repository interface in `internal/repository/interface.go`
4. Implement repository in `internal/repository/repository.go`
5. Create service layer in `internal/service/service.go`
6. Create HTTP handler in `internal/handler/handler.go`
7. Wire dependencies in `cmd/main.go`
8. Add Dockerfile and Makefile
9. Add to docker-compose.yml
10. Create database migration if needed

### Adding a New Frontend Page

1. Create page component in `src/pages/` with naming convention
2. Add route in `src/App.tsx`
3. Create/update Zustand store if new state needed
4. Create API service in `src/api/services/` if new endpoints
5. Add MSW handlers in `src/mocks/handlers/` for development

### Adding a New API Endpoint

**Backend:**
1. Add method to repository interface and implementation
2. Add method to service layer
3. Add handler method and route registration

**Frontend:**
1. Add method to appropriate API service
2. Add store action if state management needed
3. Add MSW handler for development

---

## Troubleshooting

### Common Issues

**"MSW not intercepting requests"**
- Ensure `VITE_ENABLE_MSW=true` is set
- Check browser console for `[MSW] Mocking enabled` message

**"JWT token expired"**
- Clear localStorage and re-login
- Check JWT_SECRET matches between services

**"Database connection failed"**
- Ensure PostgreSQL is running: `docker ps | grep postgres`
- Check connection string in environment variables

**"Clockify sync not working"**
- Verify API key is configured in settings
- Check sync-service logs: `docker logs kensan-sync-service`

### Useful Commands

```bash
# View all service logs
make logs

# View specific service logs
docker logs -f kensan-timeblock-service

# Check database directly
docker exec -it kensan-postgres psql -U kensan -d kensan

# Rebuild single service
docker compose build timeblock-service

# Reset database (warning: deletes all data)
make clean && make up
```

---

## Architecture Documentation

**IMPORTANT**: 各コードベースには詳細なアーキテクチャドキュメントがあります。作業前に必ず読んでください。

| Document | Location | Description |
|----------|----------|-------------|
| Backend Architecture | `backend/ARCHITECTURE.md` | Goマイクロサービス、API仕様、DBスキーマ、認証フロー |
| Frontend Architecture | `src/ARCHITECTURE.md` | React/TypeScript、Zustand、コンポーネント階層、APIクライアント |
| AI Service Architecture | `kensan-ai/ARCHITECTURE.md` | Direct Tools、エージェント、コンテキスト管理、メモリシステム |

### ドキュメント更新ルール

**コードを変更したら、対応するARCHITECTURE.mdも更新してください：**

- 新しいサービス/エンドポイント追加 → `backend/ARCHITECTURE.md`のAPI Reference更新
- 新しいコンポーネント/ストア追加 → `src/ARCHITECTURE.md`の該当セクション更新
- 新しいツール/エージェント追加 → `kensan-ai/ARCHITECTURE.md`のTools/Agents更新
- DBスキーマ変更 → `backend/ARCHITECTURE.md`のDatabase Schema更新
- 新しいパターン導入 → Key Patternsセクション更新

---

## Other Documentation

| Document | Location | Description |
|----------|----------|-------------|
| Project Proposal | `mydocs/kensan_proposal_v0.5.md` | Full project specification |
| Screen Requirements | `mydocs/kensan_screen_requirements.md` | UI/UX requirements |
| API Specification | `mydocs/api_specification.md` | Endpoint documentation |
| Development Status | `mydocs/DEVELOPMENT_STATUS.md` | Current implementation status |
| Architecture Guide | `mydocs/architecture_guide_for_beginners.md` | Beginner-friendly architecture explanation |
| Implementation Overview | `mydocs/implementation_overview.md` | Frontend technical guide |
| ADRs | `mydocs/adr/` | Architecture Decision Records |
