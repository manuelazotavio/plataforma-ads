create table if not exists public.event_contributors (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_contributors_event_idx
  on public.event_contributors (event_id, display_order, created_at);

alter table public.event_contributors enable row level security;

drop policy if exists "Anyone can read event contributors" on public.event_contributors;
create policy "Anyone can read event contributors"
  on public.event_contributors for select
  using (true);

drop policy if exists "Admins can manage event contributors" on public.event_contributors;
create policy "Admins can manage event contributors"
  on public.event_contributors for all
  using (
    exists (
      select 1
      from public.users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
  );

create or replace function public.touch_event_contributors_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists event_contributors_touch_updated_at on public.event_contributors;
create trigger event_contributors_touch_updated_at
  before update on public.event_contributors
  for each row
  execute function public.touch_event_contributors_updated_at();
