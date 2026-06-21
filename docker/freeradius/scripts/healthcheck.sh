#!/bin/sh
# FreeRADIUS health check — sends a test auth request to localhost
# Used by Docker HEALTHCHECK

set -e

RADIUS_SECRET="${RADIUS_TEST_SECRET:-testing123}"
RADIUS_HOST="127.0.0.1"
RADIUS_PORT="1812"

echo "User-Name = health-check" | \
  radclient -t 3 -r 1 "${RADIUS_HOST}:${RADIUS_PORT}" auth "${RADIUS_SECRET}" 2>&1 | \
  grep -qE "(Access-Accept|Access-Reject)" && exit 0

exit 1
