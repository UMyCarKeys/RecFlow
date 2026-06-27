CREATE TYPE public.track_stage AS ENUM ('idea', 'demo', 'mix', 'final_mix', 'master');

ALTER TABLE public.tracks
  ADD COLUMN stage public.track_stage NOT NULL DEFAULT 'idea',
  ADD COLUMN notes TEXT,
  ADD COLUMN links JSONB NOT NULL DEFAULT '[]';
