-- Parallel "lines of inspiration" for a track during the creative window.
-- variant labels a version's line; set_aside hides the non-chosen lines once
-- the track commits to one direction past the Mix stage.
ALTER TABLE public.versions ADD COLUMN IF NOT EXISTS variant text;
ALTER TABLE public.versions ADD COLUMN IF NOT EXISTS set_aside boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_versions_variant ON public.versions(track_id, variant);
