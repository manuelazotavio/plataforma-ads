alter table public.events
  add column if not exists countdown_user_id uuid references public.users(id) on delete set null;
