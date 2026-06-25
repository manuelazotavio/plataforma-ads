ALTER TABLE public.store_items
  ADD COLUMN IF NOT EXISTS collective_deadline date;

ALTER TABLE public.store_signups
  ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}'::jsonb;
