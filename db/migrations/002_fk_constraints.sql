-- Migration: 002_fk_constraints
-- Description: Add missing foreign key constraints for referential integrity
-- Direction: UP
-- Rollback: 002_fk_constraints_rollback.sql
-- Generated: 2026-06-21
--
-- Impact Analysis:
--   - Existing orphaned rows will cause constraint violations.
--   - Run 002_fk_orphan_cleanup.sql FIRST if migrating existing data.
--   - All constraints use DEFERRABLE INITIALLY DEFERRED for transaction safety.

BEGIN;

-- Prevent orphaned switches referencing non-existent sites
ALTER TABLE switches
  ADD CONSTRAINT fk_switches_site_id
  FOREIGN KEY (site_id) REFERENCES sites(id)
  ON DELETE SET NULL
  ON UPDATE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- Prevent orphaned devices referencing non-existent VLANs
ALTER TABLE devices
  ADD CONSTRAINT fk_devices_vlan_id
  FOREIGN KEY (vlan_id) REFERENCES vlans(id)
  ON DELETE SET NULL
  ON UPDATE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- Prevent orphaned devices referencing non-existent sites
ALTER TABLE devices
  ADD CONSTRAINT fk_devices_site_id
  FOREIGN KEY (site_id) REFERENCES sites(id)
  ON DELETE SET NULL
  ON UPDATE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- Ensure device history links to real devices
ALTER TABLE device_history
  ADD CONSTRAINT fk_device_history_device_id
  FOREIGN KEY (device_id) REFERENCES devices(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- Ensure discovery jobs link to real sources
ALTER TABLE discovery_jobs
  ADD CONSTRAINT fk_discovery_jobs_source_id
  FOREIGN KEY (source_id) REFERENCES discovery_sources(id)
  ON DELETE SET NULL
  ON UPDATE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- Ensure radius groups link to real VLANs
ALTER TABLE radius_groups
  ADD CONSTRAINT fk_radius_groups_vlan_id
  FOREIGN KEY (vlan_id) REFERENCES vlans(id)
  ON DELETE SET NULL
  ON UPDATE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- Ensure NAC policies link to real VLANs
ALTER TABLE nac_policies
  ADD CONSTRAINT fk_nac_policies_vlan_id
  FOREIGN KEY (vlan_id) REFERENCES vlans(id)
  ON DELETE SET NULL
  ON UPDATE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- Ensure alerts link to real devices (optional — alerts may exist for non-device events)
ALTER TABLE alerts
  ADD CONSTRAINT fk_alerts_device_id
  FOREIGN KEY (device_id) REFERENCES devices(id)
  ON DELETE SET NULL
  ON UPDATE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

COMMIT;
