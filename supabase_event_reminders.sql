
create table if not exists public.event_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  notified_3d boolean not null default false,
  notified_1d boolean not null default false,
  unique (user_id, event_id)
);

create index if not exists event_reminders_event_idx on public.event_reminders (event_id);
create index if not exists event_reminders_user_idx on public.event_reminders (user_id);

alter table public.event_reminders enable row level security;

create policy "Users can view own event reminders"
  on public.event_reminders for select
  using (auth.uid() = user_id);

create policy "Users can create own event reminders"
  on public.event_reminders for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own event reminders"
  on public.event_reminders for delete
  using (auth.uid() = user_id);

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('comment','reply','reaction','comment_reaction','event_reminder'));

alter table public.notifications drop constraint if exists notifications_target_type_check;
alter table public.notifications add constraint notifications_target_type_check
  check (target_type in ('article','project','forum_topic','event'));
