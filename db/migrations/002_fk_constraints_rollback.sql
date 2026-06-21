-- Migration ROLLBACK: 002_fk_constraints
-- Description: Remove foreign key constraints added in migration 002
-- Generated: 2026-06-21

BEGIN;

ALTER TABLE switches      DROP CONSTRAINT IF EXISTS fk_switches_site_id;
ALTER TABLE devices       DROP CONSTRAINT IF EXISTS fk_devices_vlan_id;
ALTER TABLE devices       DROP CONSTRAINT IF EXISTS fk_devices_site_id;
ALTER TABLE device_history DROP CONSTRAINT IF EXISTS fk_device_history_device_id;
ALTER TABLE discovery_jobs DROP CONSTRAINT IF EXISTS fk_discovery_jobs_source_id;
ALTER TABLE radius_groups  DROP CONSTRAINT IF EXISTS fk_radius_groups_vlan_id;
ALTER TABLE nac_policies   DROP CONSTRAINT IF EXISTS fk_nac_policies_vlan_id;
ALTER TABLE alerts         DROP CONSTRAINT IF EXISTS fk_alerts_device_id;

COMMIT;
