-- Enable full replica identity on scripts so UPDATE events carry both old and new row
ALTER TABLE scripts REPLICA IDENTITY FULL;
ALTER TABLE chasers REPLICA IDENTITY FULL;

-- Add both tables to the supabase_realtime publication if not already there
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'scripts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE scripts;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'chasers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chasers;
  END IF;
END $;
