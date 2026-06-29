-- Make track-level activity live (ideas/links, stage, title, archived) by adding
-- the tracks table to the realtime publication. Idempotent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tracks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tracks;
  END IF;
END $$;
