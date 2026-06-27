alter table if exists public.store_seller_profiles enable row level security;

drop policy if exists "store_seller_profiles_select_all" on public.store_seller_profiles;
create policy "store_seller_profiles_select_all"
  on public.store_seller_profiles for select
  using (true);

drop policy if exists "store_seller_profiles_insert_admin" on public.store_seller_profiles;
create policy "store_seller_profiles_insert_admin"
  on public.store_seller_profiles for insert
  with check (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

drop policy if exists "store_seller_profiles_update_admin" on public.store_seller_profiles;
create policy "store_seller_profiles_update_admin"
  on public.store_seller_profiles for update
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

drop policy if exists "store_seller_profiles_delete_admin" on public.store_seller_profiles;
create policy "store_seller_profiles_delete_admin"
  on public.store_seller_profiles for delete
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );
