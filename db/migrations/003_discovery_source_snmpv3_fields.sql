-- Migration: 003_discovery_source_snmpv3_fields
-- Description: Add SNMPv3 fields, health tracking, and job tracking to discovery tables
-- Direction: UP
-- Rollback: 003_discovery_source_snmpv3_fields_rollback.sql
-- Generated: 2026-06-21

BEGIN;

ALTER TABLE discovery_sources
  ADD COLUMN IF NOT EXISTS snmp_version            TEXT DEFAULT 'v2c',
  ADD COLUMN IF NOT EXISTS snmp_auth_protocol      TEXT,
  ADD COLUMN IF NOT EXISTS snmp_priv_protocol      TEXT,
  ADD COLUMN IF NOT EXISTS snmp_auth_key           TEXT,
  ADD COLUMN IF NOT EXISTS snmp_priv_key           TEXT,
  ADD COLUMN IF NOT EXISTS snmp_context_name       TEXT,
  ADD COLUMN IF NOT EXISTS last_error              TEXT,
  ADD COLUMN IF NOT EXISTS consecutive_failures    INTEGER NOT NULL DEFAULT 0;

ALTER TABLE discovery_jobs
  ADD COLUMN IF NOT EXISTS triggered_by TEXT;

CREATE TABLE IF NOT EXISTS integration_logs (
  id          SERIAL PRIMARY KEY,
  job_id      INTEGER,
  source_id   INTEGER,
  level       TEXT NOT NULL DEFAULT 'info',
  message     TEXT NOT NULL,
  details     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_logs_job_id    ON integration_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_source_id ON integration_logs(source_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_created_at ON integration_logs(created_at DESC);

COMMIT;
