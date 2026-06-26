ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.versions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks           ENABLE ROW LEVEL SECURITY;

-- Helper functions (SECURITY DEFINER avoids RLS recursion on nested joins)
CREATE OR REPLACE FUNCTION public.is_project_member(pid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = pid AND user_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_contributor(pid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = pid
      AND user_id = (SELECT auth.uid())
      AND role IN ('owner', 'contributor')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_owner(pid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = pid
      AND user_id = (SELECT auth.uid())
      AND role = 'owner'
  );
$$;

-- PROFILES
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);

-- PROJECTS
CREATE POLICY "projects_select" ON public.projects FOR SELECT TO authenticated
  USING (public.is_project_member(id));
CREATE POLICY "projects_insert" ON public.projects FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY "projects_update" ON public.projects FOR UPDATE TO authenticated
  USING (public.is_project_owner(id));
CREATE POLICY "projects_delete" ON public.projects FOR DELETE TO authenticated
  USING (public.is_project_owner(id));

-- PROJECT MEMBERS
CREATE POLICY "members_select" ON public.project_members FOR SELECT TO authenticated
  USING (public.is_project_member(project_id));
CREATE POLICY "members_all" ON public.project_members FOR ALL TO authenticated
  USING (public.is_project_owner(project_id));

-- TRACKS
CREATE POLICY "tracks_select" ON public.tracks FOR SELECT TO authenticated
  USING (public.is_project_member(project_id));
CREATE POLICY "tracks_all" ON public.tracks FOR ALL TO authenticated
  USING (public.is_project_contributor(project_id));

-- VERSIONS
CREATE POLICY "versions_select" ON public.versions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks t
      WHERE t.id = versions.track_id AND public.is_project_member(t.project_id)
    )
  );
CREATE POLICY "versions_insert" ON public.versions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tracks t
      WHERE t.id = versions.track_id AND public.is_project_contributor(t.project_id)
    )
    AND (SELECT auth.uid()) = uploaded_by
  );

-- COMMENTS
CREATE POLICY "comments_select" ON public.comments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.versions v
      JOIN public.tracks t ON t.id = v.track_id
      WHERE v.id = comments.version_id AND public.is_project_member(t.project_id)
    )
  );
CREATE POLICY "comments_insert" ON public.comments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.versions v
      JOIN public.tracks t ON t.id = v.track_id
      WHERE v.id = comments.version_id AND public.is_project_member(t.project_id)
    )
    AND (SELECT auth.uid()) = author_id
  );
CREATE POLICY "comments_update" ON public.comments FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = author_id);
CREATE POLICY "comments_delete" ON public.comments FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = author_id);

-- TASKS
CREATE POLICY "tasks_select" ON public.tasks FOR SELECT TO authenticated
  USING (public.is_project_member(project_id));
CREATE POLICY "tasks_all" ON public.tasks FOR ALL TO authenticated
  USING (public.is_project_contributor(project_id));
