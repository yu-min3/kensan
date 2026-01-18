.PHONY: up down build logs ps clean frontend backend db help

# Default target
.DEFAULT_GOAL := help

# =============================================================================
# Full Stack Commands
# =============================================================================

## Start all services (frontend + backend + database)
up:
	docker compose up -d
	@echo ""
	@echo "🚀 Kensan is starting..."
	@echo ""
	@echo "Frontend:  http://localhost:5173"
	@echo "Services:"
	@echo "  - user-service:      http://localhost:8081/health"
	@echo "  - task-service:      http://localhost:8082/health"
	@echo "  - sync-service:      http://localhost:8083/health"
	@echo "  - timeblock-service: http://localhost:8084/health"
	@echo "  - routine-service:   http://localhost:8085/health"
	@echo "  - record-service:    http://localhost:8086/health"
	@echo "  - diary-service:     http://localhost:8087/health"
	@echo "  - analytics-service: http://localhost:8088/health"
	@echo "  - ai-service:        http://localhost:8089/health"
	@echo ""
	@echo "Database:  postgres://kensan:kensan@localhost:5432/kensan"
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

## Start only backend services (requires db)
backend: db
	docker compose up -d user-service task-service sync-service timeblock-service routine-service record-service diary-service analytics-service ai-service
	@echo "All backend services started"

# =============================================================================
# Development Commands
# =============================================================================

## Start frontend in local dev mode (not Docker)
dev-frontend:
	npm run dev

## Start backend services only (for local frontend development)
dev-backend: db backend

# =============================================================================
# Health Check
# =============================================================================

## Check health of all services
health:
	@echo "Checking service health..."
	@echo ""
	@curl -s http://localhost:8081/health 2>/dev/null | jq . || echo "user-service: DOWN"
	@curl -s http://localhost:8082/health 2>/dev/null | jq . || echo "task-service: DOWN"
	@curl -s http://localhost:8083/health 2>/dev/null | jq . || echo "sync-service: DOWN"
	@curl -s http://localhost:8084/health 2>/dev/null | jq . || echo "timeblock-service: DOWN"
	@curl -s http://localhost:8085/health 2>/dev/null | jq . || echo "routine-service: DOWN"
	@curl -s http://localhost:8086/health 2>/dev/null | jq . || echo "record-service: DOWN"
	@curl -s http://localhost:8087/health 2>/dev/null | jq . || echo "diary-service: DOWN"
	@curl -s http://localhost:8088/health 2>/dev/null | jq . || echo "analytics-service: DOWN"
	@curl -s http://localhost:8089/health 2>/dev/null | jq . || echo "ai-service: DOWN"

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
	@echo "  up        Start all services (frontend + backend + db)"
	@echo "  down      Stop all services"
	@echo "  build     Build all Docker images"
	@echo "  rebuild   Rebuild and start all services"
	@echo "  logs      View logs for all services"
	@echo "  ps        Show running containers"
	@echo "  clean     Remove all containers and volumes"
	@echo ""
	@echo "Selective Start:"
	@echo "  frontend  Start only frontend"
	@echo "  backend   Start database + all backend services"
	@echo "  db        Start only database"
	@echo ""
	@echo "Development:"
	@echo "  dev-frontend  Run frontend locally (npm run dev)"
	@echo "  dev-backend   Start backend in Docker for local frontend"
	@echo ""
	@echo "Utilities:"
	@echo "  health    Check health of all services"
	@echo "  log SERVICE=x  View logs for specific service"
