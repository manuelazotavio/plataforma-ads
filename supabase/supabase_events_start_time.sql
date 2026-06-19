alter table public.events
  add column if not exists start_time time;
