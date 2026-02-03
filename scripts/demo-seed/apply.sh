#!/bin/bash
# ============================================================================
# Demo Seed: Apply all SQL files
# ============================================================================
# Usage: ./scripts/demo-seed/apply.sh
#
# Applies all demo seed SQL files in order to the kensan database.
# Safe to run multiple times (idempotent — cleanup runs first).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONTAINER="kensan-postgres"
DB_USER="kensan"
DB_NAME="kensan"

echo "=== Kensan Demo Seed ==="
echo ""

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo "ERROR: Container '${CONTAINER}' is not running."
    echo "Run 'make up' or 'make db' first."
    exit 1
fi

# Apply each SQL file in order
for f in "${SCRIPT_DIR}"/0*.sql; do
    filename=$(basename "$f")
    echo "Applying ${filename}..."
    docker exec -i "${CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" < "$f"
done

echo ""
echo "=== Demo seed complete ==="
echo ""
echo "Login: demo@kensan.dev / demo1234"
echo "User:  田中翔太 (Tanaka Shota)"
