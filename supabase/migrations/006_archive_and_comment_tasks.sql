-- Archive flag for tracks (excluded from progress + the record's rings)
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

-- Tasks can attach to a comment (a task can't exist without a comment anchor)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tasks_comment ON public.tasks(comment_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON public.tasks(assignee_id, status);
