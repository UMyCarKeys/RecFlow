-- Security fix: scope cover mutations to the project's owner.
--
-- 007 allowed ANY authenticated user to insert/update/delete ANY object in the
-- public 'covers' bucket. Since the bucket is publicly readable (and therefore
-- listable), another user could discover any cover's path and overwrite or
-- delete it. Covers are stored as <project_id>/<uuid>.<ext> (see
-- src/lib/uploadCover.ts), so mutations now require ownership of the project
-- named by the first path segment. Public read is unchanged (covers render on
-- the dashboard for everyone in the project and in shared contexts).

DROP POLICY IF EXISTS "covers_auth_insert" ON storage.objects;
CREATE POLICY "covers_auth_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'covers'
    AND public.is_project_owner(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "covers_auth_update" ON storage.objects;
CREATE POLICY "covers_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'covers'
    AND public.is_project_owner(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "covers_auth_delete" ON storage.objects;
CREATE POLICY "covers_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'covers'
    AND public.is_project_owner(((storage.foldername(name))[1])::uuid)
  );
