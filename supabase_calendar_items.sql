
create table if not exists public.calendar_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  start_date date not null,
  end_date date,
  color text not null default 'zinc',
  url text,
  is_active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists calendar_items_start_idx on public.calendar_items (start_date);
create index if not exists calendar_items_active_idx on public.calendar_items (is_active) where is_active = true;

alter table public.calendar_items enable row level security;

alter table public.calendar_items
  add column if not exists visible_to_students boolean not null default true;


alter table public.calendar_items
  add column if not exists show_in_grid boolean not null default true;


alter table public.calendar_items
  add column if not exists adds_school_day boolean not null default false;

drop policy if exists "Anyone can read active calendar items" on public.calendar_items;
create policy "Calendar items audience filter"
on public.calendar_items for select
using (
  is_active = true
  and (
    visible_to_students = true
    or exists (
      select 1 from public.users
      where id = auth.uid()
      and role in ('admin', 'professor')
    )
  )
);

create policy "Admins can manage calendar items"
on public.calendar_items for all
using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
)
with check (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);
