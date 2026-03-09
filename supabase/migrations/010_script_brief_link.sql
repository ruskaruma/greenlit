-- Link scripts back to the brief they were created from
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS brief_id uuid REFERENCES briefs(id) ON DELETE SET NULL;
