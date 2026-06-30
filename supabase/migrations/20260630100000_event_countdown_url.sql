alter table public.events
  add column if not exists countdown_url text;
