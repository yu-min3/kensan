.PHONY: up down init ingest transform aggregate pipeline query summary logs health install

# --- Infrastructure (root docker-compose.yml を使用) ---

up:
	docker compose -f ../docker-compose.yml up -d postgres minio minio-init nessie
	@echo "MinIO Console: http://localhost:9001"
	@echo "Nessie API:    http://localhost:19120"

down:
	docker compose -f ../docker-compose.yml down

logs:
	docker compose -f ../docker-compose.yml logs -f postgres minio nessie

health:
	@echo "=== PostgreSQL ==="
	@pg_isready -h localhost -p 5432 -U kensan && echo " OK" || echo " FAIL"
	@echo "=== MinIO ==="
	@curl -sf http://localhost:9000/minio/health/live && echo " OK" || echo " FAIL"
	@echo "=== Nessie ==="
	@curl -sf http://localhost:19120/api/v2/config > /dev/null && echo " OK" || echo " FAIL"

# --- Python Dependencies ---

install:
	uv sync

# --- Pipeline ---

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

# --- Query ---

query:
	uv run python queries/query.py

summary:
	uv run python queries/query.py summary

# --- Clean ---

clean:
	docker compose -f ../docker-compose.yml down -v
	@echo "Volumes removed."
