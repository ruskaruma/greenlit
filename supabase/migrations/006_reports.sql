-- v2: Multi-entry, multi-platform reports
-- One report = one client + one time period + multiple content entries across all platforms

DROP TABLE IF EXISTS reports;

CREATE TABLE reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  report_title text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  entries jsonb NOT NULL DEFAULT '[]',
  aggregate_metrics jsonb,
  previous_aggregate jsonb,
  generated_summary text,
  recommendations text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- entries jsonb structure:
-- [
--   {
--     "title": "BTS at Studio",
--     "platform": "Instagram",
--     "content_type": "Reel",
--     "post_url": "https://instagram.com/p/...",
--     "post_date": "2026-03-01",
--     "metrics": { "views": 12000, "likes": 450, "comments": 23, "shares": 12, "saves": 89, "reach": 9500, "engagement_rate": 4.2 }
--   },
--   {
--     "title": "Client Testimonial",
--     "platform": "YouTube",
--     "content_type": "Video",
--     "post_url": "https://youtube.com/watch?v=...",
--     "post_date": "2026-03-04",
--     "metrics": { "views": 8500, "likes": 320, "comments": 15, "watch_time": 142, "subscribers_gained": 28, "ctr": 6.1 }
--   }
-- ]

-- aggregate_metrics: computed totals per platform + overall
-- { "overall": { "total_views": ..., "total_likes": ..., "entry_count": ... }, "Instagram": { ... }, "YouTube": { ... } }

-- previous_aggregate: auto-populated from the most recent prior report for this client
-- same structure as aggregate_metrics

CREATE INDEX idx_reports_client_id ON reports(client_id);
CREATE INDEX idx_reports_period ON reports(client_id, period_end DESC);
