-- Pre-migration cleanup: Remove orphaned rows before applying FK constraints (migration 002)
-- Run this BEFORE 002_fk_constraints.sql when migrating existing data.
-- Generated: 2026-06-21

BEGIN;

-- Nullify device.vlan_id references to non-existent VLANs
UPDATE devices SET vlan_id = NULL
WHERE vlan_id IS NOT NULL
  AND vlan_id NOT IN (SELECT id FROM vlans);

-- Nullify device.site_id references to non-existent sites
UPDATE devices SET site_id = NULL
WHERE site_id IS NOT NULL
  AND site_id NOT IN (SELECT id FROM sites);

-- Nullify switch.site_id references to non-existent sites
UPDATE switches SET site_id = NULL
WHERE site_id IS NOT NULL
  AND site_id NOT IN (SELECT id FROM sites);

-- Delete device_history rows for non-existent devices
DELETE FROM device_history
WHERE device_id NOT IN (SELECT id FROM devices);

-- Nullify discovery_job.source_id references to non-existent sources
UPDATE discovery_jobs SET source_id = NULL
WHERE source_id IS NOT NULL
  AND source_id NOT IN (SELECT id FROM discovery_sources);

-- Nullify radius_groups.vlan_id references to non-existent VLANs
UPDATE radius_groups SET vlan_id = NULL
WHERE vlan_id IS NOT NULL
  AND vlan_id NOT IN (SELECT id FROM vlans);

-- Nullify nac_policies.vlan_id references to non-existent VLANs
UPDATE nac_policies SET vlan_id = NULL
WHERE vlan_id IS NOT NULL
  AND vlan_id NOT IN (SELECT id FROM vlans);

-- Nullify alerts.device_id references to non-existent devices
UPDATE alerts SET device_id = NULL
WHERE device_id IS NOT NULL
  AND device_id NOT IN (SELECT id FROM devices);

COMMIT;
