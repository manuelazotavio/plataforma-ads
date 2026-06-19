alter table public.users
  add column if not exists onboarding_step int not null default 0;
