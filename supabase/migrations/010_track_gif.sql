-- Optional GIF "post-it" assigned to a track (stored as a Giphy media URL)
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS gif_url text;
