create table if not exists public.page_views (
  id         uuid        primary key default gen_random_uuid(),
  created_at timestamptz not null    default now(),
  path       text        not null,
  ip         text,
  user_agent text,
  user_id    uuid        references public.users(id) on delete set null
);

create index if not exists page_views_created_at_idx on public.page_views (created_at desc);
create index if not exists page_views_path_idx       on public.page_views (path);
create index if not exists page_views_ip_idx         on public.page_views (ip);

alter table public.page_views enable row level security;

create policy "Anyone can insert page_views"
  on public.page_views for insert
  with check (true);

create policy "Admins can read page_views"
  on public.page_views for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );
