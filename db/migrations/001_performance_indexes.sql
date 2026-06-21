-- Migration: 001_performance_indexes
-- Description: Add missing performance indexes to all high-traffic tables
-- Direction: UP
-- Rollback: 001_performance_indexes_rollback.sql
-- Generated: 2026-06-21

BEGIN;

-- devices table indexes
CREATE INDEX IF NOT EXISTS idx_devices_status      ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_vlan_id     ON devices(vlan_id);
CREATE INDEX IF NOT EXISTS idx_devices_site_id     ON devices(site_id);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen   ON devices(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_devices_ip_address  ON devices(ip_address);
CREATE INDEX IF NOT EXISTS idx_devices_radius_synced ON devices(radius_synced) WHERE radius_synced = false;
CREATE INDEX IF NOT EXISTS idx_devices_created_at  ON devices(created_at DESC);

-- device_history indexes
CREATE INDEX IF NOT EXISTS idx_device_history_device_id  ON device_history(device_id);
CREATE INDEX IF NOT EXISTS idx_device_history_created_at ON device_history(created_at DESC);

-- audit_logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id    ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity     ON audit_logs(entity_type, entity_id);

-- alerts indexes
CREATE INDEX IF NOT EXISTS idx_alerts_status    ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity  ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_device_id ON alerts(device_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);

-- discovery_jobs indexes
CREATE INDEX IF NOT EXISTS idx_discovery_jobs_status     ON discovery_jobs(status);
CREATE INDEX IF NOT EXISTS idx_discovery_jobs_source_id  ON discovery_jobs(source_id);
CREATE INDEX IF NOT EXISTS idx_discovery_jobs_created_at ON discovery_jobs(created_at DESC);

-- discovery_sources indexes
CREATE INDEX IF NOT EXISTS idx_discovery_sources_type    ON discovery_sources(type);
CREATE INDEX IF NOT EXISTS idx_discovery_sources_enabled ON discovery_sources(enabled) WHERE enabled = true;

-- switches indexes
CREATE INDEX IF NOT EXISTS idx_switches_site_id    ON switches(site_id);
CREATE INDEX IF NOT EXISTS idx_switches_ip_address ON switches(ip_address);

-- radius_groups indexes
CREATE INDEX IF NOT EXISTS idx_radius_groups_vlan_id ON radius_groups(vlan_id);

-- nac_policies indexes
CREATE INDEX IF NOT EXISTS idx_nac_policies_priority ON nac_policies(priority);
CREATE INDEX IF NOT EXISTS idx_nac_policies_enabled  ON nac_policies(enabled) WHERE enabled = true;

COMMIT;
