alter table public.professors
  add column if not exists photo_credit_user_id uuid references public.users(id) on delete set null;
