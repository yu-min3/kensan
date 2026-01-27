.PHONY: up down build logs ps clean frontend backend db storage help dev dev-docker dev-backend

# Default target
.DEFAULT_GOAL := help

# =============================================================================
# Full Stack Commands
# =============================================================================

## Start all services (frontend + backend + database + storage)
up:
	docker compose up -d
	@echo ""
	@echo "🚀 Kensan is starting..."
	@echo ""
	@echo "Frontend:  http://localhost:5173"
	@echo "Services:"
	@echo "  - user-service:      http://localhost:8081/health"
	@echo "  - task-service:      http://localhost:8082/health"
	@echo "  - timeblock-service: http://localhost:8084/health"
	@echo "  - analytics-service: http://localhost:8088/health"
	@echo "  - memo-service:      http://localhost:8090/health"
	@echo "  - note-service:      http://localhost:8091/health"
	@echo ""
	@echo "Database:  postgres://kensan:kensan@localhost:5432/kensan"
	@echo "Storage:   http://localhost:9000 (MinIO API)"
	@echo "           http://localhost:9001 (MinIO Console - kensan/kensan123)"
	@echo ""
	@echo "Use 'make logs' to view logs"
	@echo "Use 'make down' to stop all services"

## Stop all services
down:
	docker compose down

## Build all images
build:
	docker compose build

## Rebuild and start all services
rebuild: build up

## View logs (all services)
logs:
	docker compose logs -f

## View logs for specific service (usage: make log SERVICE=frontend)
log:
	docker compose logs -f $(SERVICE)

## Show running containers
ps:
	docker compose ps

## Remove all containers, networks, and volumes
clean:
	docker compose down -v --remove-orphans
	docker system prune -f

# =============================================================================
# Selective Start Commands
# =============================================================================

## Start only frontend
frontend:
	docker compose up -d frontend
	@echo "Frontend: http://localhost:5173"

## Start only database
db:
	docker compose up -d postgres
	@echo "Waiting for PostgreSQL to be ready..."
	@sleep 3
	@echo "Database: postgres://kensan:kensan@localhost:5432/kensan"

## Start only storage (MinIO)
storage:
	docker compose up -d minio minio-init
	@echo "Waiting for MinIO to be ready..."
	@sleep 3
	@echo "Storage API:     http://localhost:9000"
	@echo "Storage Console: http://localhost:9001 (kensan/kensan123)"

## Start only backend services (requires db and storage)
backend: db storage
	docker compose up -d user-service task-service timeblock-service analytics-service memo-service note-service
	@echo "All backend services started"

# =============================================================================
# Development Commands
# =============================================================================

## Start in development mode with MSW mocking (frontend-only, no backend needed)
dev:
	@echo ""
	@echo "🔧 Development Mode (MSW Mocking)"
	@echo ""
	@echo "Starting frontend with MSW enabled..."
	@echo "All API requests will be mocked. No backend required."
	@echo ""
	npm run dev:mock

## Start with Docker + MSW (alternative to local npm)
dev-docker:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build frontend
	@echo ""
	@echo "🔧 Development Mode (Docker + MSW)"
	@echo ""
	@echo "Frontend: http://localhost:5173"
	@echo ""

## Start backend services only (for local frontend development)
dev-backend: db backend
	@echo ""
	@echo "Backend services started. Now run 'npm run dev' for frontend."

# =============================================================================
# Health Check
# =============================================================================

## Check health of all services
health:
	@echo "Checking service health..."
	@echo ""
	@curl -s http://localhost:8081/health 2>/dev/null | jq . || echo "user-service: DOWN"
	@curl -s http://localhost:8082/health 2>/dev/null | jq . || echo "task-service: DOWN"
	@curl -s http://localhost:8084/health 2>/dev/null | jq . || echo "timeblock-service: DOWN"
	@curl -s http://localhost:8088/health 2>/dev/null | jq . || echo "analytics-service: DOWN"
	@curl -s http://localhost:8089/health 2>/dev/null | jq . || echo "ai-service: DOWN"
	@curl -s http://localhost:8090/health 2>/dev/null | jq . || echo "memo-service: DOWN"
	@curl -s http://localhost:8091/health 2>/dev/null | jq . || echo "note-service: DOWN"

# =============================================================================
# Help
# =============================================================================

## Show this help
help:
	@echo "Kensan - Development Commands"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Full Stack:"
	@echo "  up        Start all services (frontend + backend + db + storage)"
	@echo "  down      Stop all services"
	@echo "  build     Build all Docker images"
	@echo "  rebuild   Rebuild and start all services"
	@echo "  logs      View logs for all services"
	@echo "  ps        Show running containers"
	@echo "  clean     Remove all containers and volumes"
	@echo ""
	@echo "Selective Start:"
	@echo "  frontend  Start only frontend"
	@echo "  backend   Start database + storage + all backend services"
	@echo "  db        Start only database"
	@echo "  storage   Start only storage (MinIO)"
	@echo ""
	@echo "Development:"
	@echo "  dev           Start frontend with MSW mocking (npm, no backend)"
	@echo "  dev-docker    Start frontend with MSW in Docker"
	@echo "  dev-backend   Start backend services for local frontend"
	@echo ""
	@echo "Utilities:"
	@echo "  health    Check health of all services"
	@echo "  log SERVICE=x  View logs for specific service"
