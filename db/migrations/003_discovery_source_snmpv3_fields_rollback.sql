-- Migration ROLLBACK: 003_discovery_source_snmpv3_fields
-- Generated: 2026-06-21

BEGIN;

ALTER TABLE discovery_sources
  DROP COLUMN IF EXISTS snmp_version,
  DROP COLUMN IF EXISTS snmp_auth_protocol,
  DROP COLUMN IF EXISTS snmp_priv_protocol,
  DROP COLUMN IF EXISTS snmp_auth_key,
  DROP COLUMN IF EXISTS snmp_priv_key,
  DROP COLUMN IF EXISTS snmp_context_name,
  DROP COLUMN IF EXISTS last_error,
  DROP COLUMN IF EXISTS consecutive_failures;

ALTER TABLE discovery_jobs
  DROP COLUMN IF EXISTS triggered_by;

DROP TABLE IF EXISTS integration_logs;

COMMIT;
