-- Migration 013: Polish fixes
-- Add skip_reason to agent_queue for monitor skip logging

ALTER TABLE agent_queue ADD COLUMN IF NOT EXISTS skip_reason text;
