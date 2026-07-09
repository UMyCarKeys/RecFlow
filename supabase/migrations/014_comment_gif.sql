-- GIFs on comments: a comment can carry one Giphy GIF alongside (or instead
-- of) its text. Mirrors 010_track_gif.sql, which added the same to tracks.
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS gif_url text;
