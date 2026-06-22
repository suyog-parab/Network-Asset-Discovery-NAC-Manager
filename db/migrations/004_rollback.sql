-- Rollback for migration 004
ALTER TABLE discovery_sources
  DROP COLUMN IF EXISTS base_dn,
  DROP COLUMN IF EXISTS last_highest_usn,
  DROP COLUMN IF EXISTS private_key;
