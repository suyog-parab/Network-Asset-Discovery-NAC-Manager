-- Migration ROLLBACK: 001_performance_indexes
-- Description: Remove performance indexes added in migration 001
-- Generated: 2026-06-21

BEGIN;

DROP INDEX IF EXISTS idx_devices_status;
DROP INDEX IF EXISTS idx_devices_vlan_id;
DROP INDEX IF EXISTS idx_devices_site_id;
DROP INDEX IF EXISTS idx_devices_last_seen;
DROP INDEX IF EXISTS idx_devices_ip_address;
DROP INDEX IF EXISTS idx_devices_radius_synced;
DROP INDEX IF EXISTS idx_devices_created_at;
DROP INDEX IF EXISTS idx_device_history_device_id;
DROP INDEX IF EXISTS idx_device_history_created_at;
DROP INDEX IF EXISTS idx_audit_logs_created_at;
DROP INDEX IF EXISTS idx_audit_logs_user_id;
DROP INDEX IF EXISTS idx_audit_logs_entity;
DROP INDEX IF EXISTS idx_alerts_status;
DROP INDEX IF EXISTS idx_alerts_severity;
DROP INDEX IF EXISTS idx_alerts_device_id;
DROP INDEX IF EXISTS idx_alerts_created_at;
DROP INDEX IF EXISTS idx_discovery_jobs_status;
DROP INDEX IF EXISTS idx_discovery_jobs_source_id;
DROP INDEX IF EXISTS idx_discovery_jobs_created_at;
DROP INDEX IF EXISTS idx_discovery_sources_type;
DROP INDEX IF EXISTS idx_discovery_sources_enabled;
DROP INDEX IF EXISTS idx_switches_site_id;
DROP INDEX IF EXISTS idx_switches_ip_address;
DROP INDEX IF EXISTS idx_radius_groups_vlan_id;
DROP INDEX IF EXISTS idx_nac_policies_priority;
DROP INDEX IF EXISTS idx_nac_policies_enabled;

COMMIT;
