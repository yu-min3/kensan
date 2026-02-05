.PHONY: up down dremio-up dremio-down trino-up trino-down all-up all-down \
       openmetadata-up openmetadata-down \
       init ingest transform aggregate pipeline query summary logs health install test \
       dagster-logs dagster-dev clean

COMMON       := -f docker-compose.common.yml
DREMIO       := $(COMMON) -f docker-compose.dremio.yml
TRINO        := $(COMMON) -f docker-compose.trino.yml
ALL          := $(COMMON) -f docker-compose.dremio.yml -f docker-compose.trino.yml
OPENMETADATA := -f docker-compose.openmetadata.yml

# =============================================================================
# Lakehouse Stack (requires: make up in root for MinIO)
# =============================================================================

## Base: Nessie + Dagster
up:
	docker compose $(COMMON) up -d
	@echo ""
	@echo "Nessie API:       http://localhost:19120"
	@echo "Dagster UI:       http://localhost:3070"

down:
	docker compose $(COMMON) down

## Pattern A: Base + Dremio
dremio-up:
	docker compose $(DREMIO) up -d
	@echo ""
	@echo "Nessie API:       http://localhost:19120"
	@echo "Dagster UI:       http://localhost:3070"
	@echo "Dremio UI:        http://localhost:9047"

dremio-down:
	docker compose $(DREMIO) down

## Pattern B: Base + Trino + Superset
trino-up:
	docker compose $(TRINO) up -d
	@echo ""
	@echo "Nessie API:       http://localhost:19120"
	@echo "Dagster UI:       http://localhost:3070"
	@echo "Trino:            http://localhost:8085"
	@echo "Superset:         http://localhost:8088 (admin / admin)"

trino-down:
	docker compose $(TRINO) down

## Pattern C: Base + Dremio + Trino + Superset (all query engines)
all-up:
	docker compose $(ALL) up -d
	@echo ""
	@echo "Nessie API:       http://localhost:19120"
	@echo "Dagster UI:       http://localhost:3070"
	@echo "Dremio UI:        http://localhost:9047"
	@echo "Trino:            http://localhost:8085"
	@echo "Superset:         http://localhost:8088 (admin / admin)"

all-down:
	docker compose $(ALL) down

## OpenMetadata (standalone - separate from query engine patterns)
openmetadata-up:
	docker compose $(OPENMETADATA) up -d
	@echo ""
	@echo "OpenMetadata UI:  http://localhost:8585 (admin@open-metadata.org / admin)"
	@echo "Airflow UI:       http://localhost:8080 (admin / admin)"

openmetadata-down:
	docker compose $(OPENMETADATA) down

# =============================================================================
# Health Check
# =============================================================================

health:
	@echo "=== MinIO (main stack) ==="
	@curl -sf http://localhost:9000/minio/health/live && echo " OK" || echo " FAIL"
	@echo "=== Nessie ==="
	@curl -sf http://localhost:19120/api/v2/config > /dev/null && echo " OK" || echo " FAIL"

# =============================================================================
# Python Dependencies
# =============================================================================

install:
	uv sync

# =============================================================================
# Pipeline
# =============================================================================

init:
	uv run python catalog/init_catalog.py

ingest:
	uv run python pipelines/bronze/ingest_postgres.py

transform:
	uv run python pipelines/silver/transform.py

aggregate:
	uv run python pipelines/gold/aggregate.py

pipeline: ingest transform aggregate
	@echo "Pipeline complete."

# =============================================================================
# Query
# =============================================================================

query:
	uv run python queries/query.py

summary:
	uv run python queries/query.py summary

# =============================================================================
# Test
# =============================================================================

test:
	uv run pytest tests/ -v

# =============================================================================
# Dagster
# =============================================================================

dagster-logs:
	docker compose $(COMMON) logs -f dagster-webserver dagster-daemon dagster-user-code

dagster-dev:
	uv run dagster dev -p 3070 -m dagster_project

# =============================================================================
# Logs
# =============================================================================

logs:
	docker compose $(ALL) logs -f

# =============================================================================
# Clean
# =============================================================================

clean:
	docker compose $(ALL) down -v 2>/dev/null || true
	@echo "Lakehouse volumes removed."

# =============================================================================
# Help
# =============================================================================

help:
	@echo "Lakehouse - Development Commands"
	@echo ""
	@echo "Prerequisites: Run 'make up' in project root first (MinIO must be running)"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Stack Patterns:"
	@echo "  up           Base stack (Nessie + Dagster)"
	@echo "  dremio-up    Base + Dremio"
	@echo "  trino-up     Base + Trino + Superset"
	@echo "  all-up       Base + Dremio + Trino + Superset"
	@echo ""
	@echo "  down         Stop base stack"
	@echo "  dremio-down  Stop base + Dremio"
	@echo "  trino-down   Stop base + Trino + Superset"
	@echo "  all-down     Stop all lakehouse services"
	@echo ""
	@echo "  openmetadata-up    OpenMetadata + Airflow"
	@echo "  openmetadata-down  Stop OpenMetadata"
	@echo ""
	@echo "Pipeline:"
	@echo "  init         Initialize Iceberg catalog tables"
	@echo "  ingest       Bronze: ingest from PostgreSQL"
	@echo "  transform    Silver: clean and enrich"
	@echo "  aggregate    Gold: weekly aggregations"
	@echo "  pipeline     Run full pipeline (ingest -> transform -> aggregate)"
	@echo ""
	@echo "Query:"
	@echo "  query        Interactive DuckDB REPL"
	@echo "  summary      Run summary query"
	@echo ""
	@echo "Utilities:"
	@echo "  health       Check MinIO and Nessie health"
	@echo "  logs         View all lakehouse logs"
	@echo "  dagster-logs View Dagster logs"
	@echo "  dagster-dev  Run Dagster dev server locally"
	@echo "  install      Install Python dependencies"
	@echo "  test         Run tests"
	@echo "  clean        Remove all lakehouse volumes"
