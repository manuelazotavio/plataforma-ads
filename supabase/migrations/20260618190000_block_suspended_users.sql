create or replace function public.current_user_is_suspended()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((
    select suspended
    from public.users
    where id = auth.uid()
  ), false);
$$;

revoke all on function public.current_user_is_suspended() from public;
grant execute on function public.current_user_is_suspended() to authenticated;

create or replace function public.block_suspended_user_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and public.current_user_is_suspended() then
    raise exception using
      errcode = '42501',
      message = 'Conta suspensa. Esta ação não é permitida.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all on function public.block_suspended_user_write() from public;

do $$
declare
  target_table record;
begin
  for target_table in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format(
      'drop trigger if exists block_suspended_user_writes on %I.%I',
      target_table.schemaname,
      target_table.tablename
    );
    execute format(
      'create trigger block_suspended_user_writes before insert or update or delete on %I.%I for each row execute function public.block_suspended_user_write()',
      target_table.schemaname,
      target_table.tablename
    );
  end loop;
end;
$$;

drop policy if exists "Suspended users cannot insert storage objects" on storage.objects;
create policy "Suspended users cannot insert storage objects"
on storage.objects
as restrictive
for insert
to authenticated
with check (not public.current_user_is_suspended());

drop policy if exists "Suspended users cannot update storage objects" on storage.objects;
create policy "Suspended users cannot update storage objects"
on storage.objects
as restrictive
for update
to authenticated
using (not public.current_user_is_suspended())
with check (not public.current_user_is_suspended());

drop policy if exists "Suspended users cannot delete storage objects" on storage.objects;
create policy "Suspended users cannot delete storage objects"
on storage.objects
as restrictive
for delete
to authenticated
using (not public.current_user_is_suspended());
