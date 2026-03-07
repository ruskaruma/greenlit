CREATE TABLE IF NOT EXISTS agent_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id uuid REFERENCES scripts(id) ON DELETE CASCADE,
  status text DEFAULT 'queued',
  error text,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);
