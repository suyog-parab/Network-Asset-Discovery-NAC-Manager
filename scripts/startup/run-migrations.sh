#!/bin/bash
# NAC Manager — Migration Runner
# Applies all SQL migrations in db/migrations/ in order.
# Tracks applied migrations in a migrations table.
# Safe to re-run — skips already-applied migrations.

set -euo pipefail

MIGRATIONS_DIR="$(dirname "$0")/../../db/migrations"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-nacuser}"
DB_NAME="${DB_NAME:-nacdb}"

PSQL="PGPASSWORD=${DB_PASS} psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME}"

echo "NAC Manager — Migration Runner"
echo "Target: ${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo ""

$PSQL -c "
CREATE TABLE IF NOT EXISTS _migrations (
  id          SERIAL PRIMARY KEY,
  filename    TEXT NOT NULL UNIQUE,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);" > /dev/null

for migration_file in $(ls "${MIGRATIONS_DIR}"/*.sql | grep -v rollback | grep -v orphan | sort); do
  filename=$(basename "${migration_file}")
  applied=$(${PSQL} -t -c "SELECT COUNT(*) FROM _migrations WHERE filename = '${filename}'" | tr -d ' ')

  if [ "${applied}" = "1" ]; then
    echo "  SKIP  ${filename} (already applied)"
  else
    echo -n "  APPLY ${filename}..."
    $PSQL -f "${migration_file}" > /dev/null
    $PSQL -c "INSERT INTO _migrations (filename) VALUES ('${filename}')" > /dev/null
    echo " DONE"
  fi
done

echo ""
echo "Migration complete."
