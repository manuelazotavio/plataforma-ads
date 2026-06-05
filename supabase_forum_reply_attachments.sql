ALTER TABLE public.forum_replies
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;
