-- Expand the track lifecycle to the standard professional production workflow.
-- New values are positioned so the enum's natural order matches the pipeline:
-- idea, demo, pre_production, recording, editing, mix, final_mix, master, release
ALTER TYPE public.track_stage ADD VALUE IF NOT EXISTS 'pre_production' AFTER 'demo';
ALTER TYPE public.track_stage ADD VALUE IF NOT EXISTS 'recording' AFTER 'pre_production';
ALTER TYPE public.track_stage ADD VALUE IF NOT EXISTS 'editing' AFTER 'recording';
ALTER TYPE public.track_stage ADD VALUE IF NOT EXISTS 'release' AFTER 'master';
