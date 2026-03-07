-- Scripts table: add missing columns
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS review_channel text DEFAULT 'email';
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS platform text DEFAULT 'instagram';
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS assigned_writer text;
-- client_feedback, version, due_date should already exist from initial schema
-- but add IF NOT EXISTS guards just in case
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='scripts' AND column_name='client_feedback') THEN
    ALTER TABLE scripts ADD COLUMN client_feedback text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='scripts' AND column_name='version') THEN
    ALTER TABLE scripts ADD COLUMN version integer DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='scripts' AND column_name='due_date') THEN
    ALTER TABLE scripts ADD COLUMN due_date timestamptz;
  END IF;
END $$;

-- Clients table: add missing columns
ALTER TABLE clients ADD COLUMN IF NOT EXISTS whatsapp_number text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS preferred_channel text DEFAULT 'email';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS instagram_handle text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS youtube_channel_id text;
-- avg_response_hours, approved_count, rejected_count, changes_requested_count may already exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='avg_response_hours') THEN
    ALTER TABLE clients ADD COLUMN avg_response_hours numeric DEFAULT 48;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='approved_count') THEN
    ALTER TABLE clients ADD COLUMN approved_count integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='rejected_count') THEN
    ALTER TABLE clients ADD COLUMN rejected_count integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='changes_requested_count') THEN
    ALTER TABLE clients ADD COLUMN changes_requested_count integer DEFAULT 0;
  END IF;
END $$;

-- Chasers table: add agent metadata columns
ALTER TABLE chasers ADD COLUMN IF NOT EXISTS critique_scores jsonb;
ALTER TABLE chasers ADD COLUMN IF NOT EXISTS revision_count integer DEFAULT 0;
ALTER TABLE chasers ADD COLUMN IF NOT EXISTS node_execution_log jsonb DEFAULT '[]';

-- WhatsApp messages table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id uuid REFERENCES scripts(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  direction text,
  message_body text,
  parsed_intent text,
  parsed_feedback text,
  created_at timestamptz DEFAULT now()
);

-- Performance reports table
CREATE TABLE IF NOT EXISTS performance_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  report_month text,
  instagram_data jsonb,
  youtube_data jsonb,
  ai_summary text,
  sent_at timestamptz,
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now()
);

-- Enable Realtime for scripts table (INSERT, UPDATE, DELETE)
-- This ensures manual status changes via PATCH are broadcast to subscribers
ALTER PUBLICATION supabase_realtime ADD TABLE scripts;
