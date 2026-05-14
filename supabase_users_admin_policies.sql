drop policy if exists "Admins can read all users" on public.users;
drop policy if exists "Admins can update users" on public.users;

create or replace function public.current_user_is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
    and role = 'admin'
  );
$$;

grant execute on function public.current_user_is_admin() to authenticated;

create policy "Admins can read all users"
on public.users for select
using (
  public.current_user_is_admin()
  or id = auth.uid()
);

create policy "Admins can update users"
on public.users for update
using (
  public.current_user_is_admin()
)
with check (
  public.current_user_is_admin()
);
