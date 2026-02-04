.PHONY: up down dremio openmetadata init ingest transform aggregate pipeline query summary logs health install test \
       common-up common-down dremio-up dremio-down trino-up trino-down dagster-logs dagster-dev

# =============================================================================
# Legacy targets (root docker-compose.yml)
# =============================================================================

up:
	docker compose -f ../docker-compose.yml up -d postgres minio minio-init nessie
	@echo "MinIO Console: http://localhost:9001"
	@echo "Nessie API:    http://localhost:19120"

dremio:
	docker compose -f ../docker-compose.yml up -d dremio
	@echo "Dremio UI: http://localhost:9047"

openmetadata:
	docker compose -f ../docker-compose.yml up -d openmetadata-server openmetadata-ingestion
	@echo "OpenMetadata UI: http://localhost:8585 (admin@open-metadata.org / admin)"
	@echo "Airflow UI:      http://localhost:8080 (admin / admin)"

down:
	docker compose -f ../docker-compose.yml down

logs:
	docker compose -f ../docker-compose.yml logs -f postgres minio nessie

# =============================================================================
# Standalone Lakehouse (docker-compose.common.yml + overlay)
# =============================================================================

# --- Common infrastructure (MinIO, Nessie) ---
common-up:
	docker compose -f docker-compose.common.yml up -d
	@echo "MinIO Console: http://localhost:9001"
	@echo "Nessie API:    http://localhost:19120"

common-down:
	docker compose -f docker-compose.common.yml down

# --- Option A: Dremio ---
dremio-up: common-up
	docker compose -f docker-compose.common.yml -f docker-compose.dremio.yml up -d
	@echo "Dremio UI: http://localhost:9047"

dremio-down:
	docker compose -f docker-compose.common.yml -f docker-compose.dremio.yml down

# --- Option B: Trino + Superset ---
trino-up: common-up
	docker compose -f docker-compose.common.yml -f docker-compose.trino.yml up -d
	@echo "Trino:    http://localhost:8085"
	@echo "Superset: http://localhost:8088 (admin / admin)"

trino-down:
	docker compose -f docker-compose.common.yml -f docker-compose.trino.yml down

# =============================================================================
# Health Check
# =============================================================================

health:
	@echo "=== MinIO ==="
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
	docker compose -f docker-compose.common.yml logs -f dagster-webserver dagster-daemon dagster-user-code

dagster-dev:
	uv run dagster dev -p 3070 -m dagster_project

# =============================================================================
# Clean
# =============================================================================

clean:
	docker compose -f docker-compose.common.yml -f docker-compose.dremio.yml -f docker-compose.trino.yml down -v 2>/dev/null || true
	docker compose -f ../docker-compose.yml down -v 2>/dev/null || true
	@echo "Volumes removed."
