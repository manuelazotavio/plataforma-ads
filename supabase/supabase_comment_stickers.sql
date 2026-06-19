
ALTER TABLE project_comments  ADD COLUMN IF NOT EXISTS mascot_id uuid REFERENCES public.mascots(id) ON DELETE SET NULL;
ALTER TABLE article_comments  ADD COLUMN IF NOT EXISTS mascot_id uuid REFERENCES public.mascots(id) ON DELETE SET NULL;
ALTER TABLE event_comments    ADD COLUMN IF NOT EXISTS mascot_id uuid REFERENCES public.mascots(id) ON DELETE SET NULL;
ALTER TABLE forum_replies      ADD COLUMN IF NOT EXISTS mascot_id uuid REFERENCES public.mascots(id) ON DELETE SET NULL;
