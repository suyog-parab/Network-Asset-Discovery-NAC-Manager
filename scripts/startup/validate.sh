#!/bin/bash
# NAC Manager — Startup Validation Script
# Verifies all required services are healthy before marking deployment complete.
# Exit code 0 = all checks passed. Exit code 1 = one or more failures.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

check() {
  local name="$1"
  local cmd="$2"
  printf "  %-40s" "${name}..."
  if eval "${cmd}" > /dev/null 2>&1; then
    echo -e "${GREEN}PASS${NC}"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}FAIL${NC}"
    FAIL=$((FAIL + 1))
  fi
}

wait_for_service() {
  local name="$1"
  local host="$2"
  local port="$3"
  local retries="${4:-30}"
  local delay="${5:-2}"

  echo -e "${YELLOW}Waiting for ${name} (${host}:${port})...${NC}"
  for i in $(seq 1 "${retries}"); do
    if nc -z "${host}" "${port}" 2>/dev/null; then
      echo -e "  ${GREEN}${name} is up (attempt ${i})${NC}"
      return 0
    fi
    sleep "${delay}"
  done
  echo -e "  ${RED}${name} did not become available after ${retries} attempts${NC}"
  return 1
}

echo ""
echo "========================================================"
echo "  NAC Manager — Startup Validation"
echo "  $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "========================================================"
echo ""

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-nacuser}"
DB_NAME="${DB_NAME:-nacdb}"
API_HOST="${API_HOST:-localhost}"
API_PORT="${API_PORT:-8080}"
NGINX_HOST="${NGINX_HOST:-localhost}"
NGINX_PORT="${NGINX_PORT:-80}"
RADIUS_HOST="${RADIUS_HOST:-localhost}"
RADIUS_PORT="${RADIUS_PORT:-1812}"

echo "--- TCP Reachability ---"
wait_for_service "PostgreSQL" "${DB_HOST}" "${DB_PORT}"
wait_for_service "API Server" "${API_HOST}" "${API_PORT}"
wait_for_service "Nginx" "${NGINX_HOST}" "${NGINX_PORT}"

echo ""
echo "--- Service Health Checks ---"

check "PostgreSQL: accepts connections" \
  "PGPASSWORD=\${DB_PASS} pg_isready -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME}"

check "PostgreSQL: nacdb schema present" \
  "PGPASSWORD=\${DB_PASS} psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -c 'SELECT COUNT(*) FROM devices'"

check "PostgreSQL: FreeRADIUS tables present" \
  "PGPASSWORD=\${DB_PASS} psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -c 'SELECT COUNT(*) FROM radcheck'"

check "API Server: /api/healthz returns 200" \
  "curl -sf http://${API_HOST}:${API_PORT}/api/healthz | grep -q 'ok'"

check "API Server: database check passes" \
  "curl -sf http://${API_HOST}:${API_PORT}/api/healthz | grep -q '\"database\"'"

check "Nginx: reverse proxy /api" \
  "curl -sf http://${NGINX_HOST}:${NGINX_PORT}/api/healthz | grep -q 'ok'"

check "Nginx: serves frontend" \
  "curl -sf http://${NGINX_HOST}:${NGINX_PORT}/ | grep -qi 'html'"

if command -v radtest &> /dev/null; then
  check "FreeRADIUS: UDP port 1812 responds" \
    "nc -zu ${RADIUS_HOST} ${RADIUS_PORT}"
fi

echo ""
echo "========================================================"
echo "  Results: ${PASS} passed, ${FAIL} failed"
echo "========================================================"
echo ""

if [ "${FAIL}" -gt 0 ]; then
  echo -e "${RED}DEPLOYMENT VALIDATION FAILED — ${FAIL} check(s) did not pass.${NC}"
  echo "Check logs with: docker compose logs --tail=100"
  exit 1
else
  echo -e "${GREEN}All checks passed. NAC Manager is ready.${NC}"
  exit 0
fi
