-- Add draft_saved to chasers status CHECK constraint
-- First drop the existing constraint if it exists, then re-add with draft_saved
DO $$
BEGIN
  -- Drop existing check constraint on chasers.status if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'chasers' AND constraint_type = 'CHECK'
    AND constraint_name LIKE '%status%'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE chasers DROP CONSTRAINT ' || constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'chasers' AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%status%'
      LIMIT 1
    );
  END IF;
END $$;

ALTER TABLE chasers ADD CONSTRAINT chasers_status_check
  CHECK (status IN ('pending_hitl', 'approved', 'rejected', 'sent', 'draft_saved'));

-- Prevent duplicate queued entries for the same script
CREATE UNIQUE INDEX IF NOT EXISTS agent_queue_script_queued_unique
  ON agent_queue (script_id)
  WHERE status = 'queued';
