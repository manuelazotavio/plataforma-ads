

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT true;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS preferred_area text;

ALTER TABLE public.users
  ALTER COLUMN onboarding_completed SET DEFAULT false;
