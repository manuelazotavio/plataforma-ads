
create table public.store_items (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  price         numeric(10,2) not null default 0,
  image_url     text,
  is_visible    boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now()
);

alter table public.store_items enable row level security;

create policy "Public can read visible items"
  on public.store_items for select
  using (
    is_visible = true
    or exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "Admins can insert store items"
  on public.store_items for insert
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

create policy "Admins can update store items"
  on public.store_items for update
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

create policy "Admins can delete store items"
  on public.store_items for delete
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
