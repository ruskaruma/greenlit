-- Content Brief intake and AI parsing system
-- Replaces the manual process of reading Google Forms and rewriting into internal brief format

CREATE TABLE IF NOT EXISTS briefs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,

  -- Raw intake (what the client/team submits)
  raw_input TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'video_script',
  platform TEXT,
  topic TEXT,
  target_audience TEXT,
  key_messages TEXT,
  tone TEXT,
  reference_links TEXT,
  deadline DATE,
  special_instructions TEXT,

  -- AI-parsed structured brief
  parsed_brief JSONB,

  -- Workflow
  status TEXT NOT NULL DEFAULT 'intake'
    CHECK (status IN ('intake', 'parsing', 'parsed', 'assigned', 'in_progress', 'script_uploaded', 'archived')),
  assigned_writer TEXT,
  script_id UUID REFERENCES scripts(id) ON DELETE SET NULL,

  -- Metadata
  parsed_at TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_briefs_client_id ON briefs(client_id);
CREATE INDEX idx_briefs_status ON briefs(status);

-- Auto-update updated_at
CREATE TRIGGER set_briefs_updated_at
  BEFORE UPDATE ON briefs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read briefs"
  ON briefs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert briefs"
  ON briefs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update briefs"
  ON briefs FOR UPDATE TO authenticated USING (true);
