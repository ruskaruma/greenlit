-- Drop and recreate reports table with all required columns
DROP TABLE IF EXISTS reports;

CREATE TABLE reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id uuid REFERENCES public.scripts(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  platform text,
  content_type text,
  content_title text,
  post_url text,
  post_date date,
  metrics jsonb NOT NULL,
  previous_metrics jsonb,
  generated_summary text,
  recommendations text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Index for fast client-scoped queries (left panel history)
CREATE INDEX idx_reports_client_id ON reports(client_id);

-- Index for ordering by created_at
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
