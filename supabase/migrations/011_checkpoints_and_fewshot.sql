-- Migration 011: Agent checkpoints for LangGraph interrupt/resume + few-shot examples
-- Enables graph pause/resume at HITL node with full state persistence

CREATE TABLE IF NOT EXISTS agent_checkpoints (
  thread_id text NOT NULL,
  checkpoint_id text NOT NULL,
  parent_checkpoint_id text,
  state jsonb NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (thread_id, checkpoint_id)
);

CREATE INDEX idx_agent_checkpoints_thread ON agent_checkpoints (thread_id, created_at DESC);

-- Pending writes table for LangGraph checkpoint protocol
CREATE TABLE IF NOT EXISTS agent_checkpoint_writes (
  thread_id text NOT NULL,
  checkpoint_id text NOT NULL,
  task_id text NOT NULL,
  idx integer NOT NULL,
  channel text NOT NULL,
  value jsonb,
  PRIMARY KEY (thread_id, checkpoint_id, task_id, idx)
);

-- Few-shot examples: team lead edits stored for future generation context
CREATE TABLE IF NOT EXISTS chaser_few_shot_examples (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  original_draft text NOT NULL,
  edited_draft text NOT NULL,
  script_title text,
  tone text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_few_shot_client ON chaser_few_shot_examples (client_id, created_at DESC);
