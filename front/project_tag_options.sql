create table if not exists public.project_tag_options (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.project_tag_options enable row level security;

create policy "Anyone can read project tag options"
on public.project_tag_options for select
using (true);

create policy "Admins can manage project tag options"
on public.project_tag_options for all
using (
  exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
);
