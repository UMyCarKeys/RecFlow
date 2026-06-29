-- Public storage bucket for custom project cover images
INSERT INTO storage.buckets (id, name, public)
VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO NOTHING;

-- Covers are public to read; any authenticated user can upload/manage them
-- (which project they apply to is still gated by the projects table RLS).
DROP POLICY IF EXISTS "covers_public_read" ON storage.objects;
CREATE POLICY "covers_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'covers');

DROP POLICY IF EXISTS "covers_auth_insert" ON storage.objects;
CREATE POLICY "covers_auth_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'covers');

DROP POLICY IF EXISTS "covers_auth_update" ON storage.objects;
CREATE POLICY "covers_auth_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'covers');

DROP POLICY IF EXISTS "covers_auth_delete" ON storage.objects;
CREATE POLICY "covers_auth_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'covers');

-- Name-change history (hidden by default; recorded for the naming progression)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS name_history jsonb NOT NULL DEFAULT '[]';
ALTER TABLE public.tracks   ADD COLUMN IF NOT EXISTS title_history jsonb NOT NULL DEFAULT '[]';
