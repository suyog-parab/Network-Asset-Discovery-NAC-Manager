-- Migration 004: Add AD/LDAP and SSH key fields to discovery_sources
-- Rollback: see 004_rollback.sql

ALTER TABLE discovery_sources
  ADD COLUMN IF NOT EXISTS base_dn         text,
  ADD COLUMN IF NOT EXISTS last_highest_usn text,
  ADD COLUMN IF NOT EXISTS private_key     text;
