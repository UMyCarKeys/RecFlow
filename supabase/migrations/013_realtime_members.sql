-- Make project membership live: the notification bell subscribes to
-- project_members inserts for the signed-in user ("You were added to X"),
-- so the table must be in the realtime publication. RLS still applies to
-- the change feed — members_select means you only receive rows for projects
-- you belong to (which now includes the one you were just added to).
-- Idempotent, same pattern as 009.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'project_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_members;
  END IF;
END $$;
