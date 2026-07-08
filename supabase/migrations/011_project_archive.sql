-- Archive flag for projects (mirrors tracks.archived from 006). Archiving
-- hides a project from the dashboard's main grid without deleting anything;
-- the project (and all its tracks/versions/comments/tasks) is preserved and
-- can still be reached/restored from its own project page. Deleting a
-- project is a separate, destructive action left to the existing
-- "projects_delete" RLS policy (002_rls.sql, owner-only) — no schema change
-- needed for that since DELETE was already permitted at the DB level.
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
