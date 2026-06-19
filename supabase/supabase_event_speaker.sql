alter table public.events
  add column if not exists speaker_name text null,
  add column if not exists speaker_user_id uuid null references public.users(id) on delete set null;
