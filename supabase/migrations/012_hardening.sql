-- Migration 012: Hardening — response_deadline_minutes default, indexes
-- Ensures the column exists with a sensible default for all deployments

ALTER TABLE scripts ADD COLUMN IF NOT EXISTS response_deadline_minutes integer DEFAULT 2880;
