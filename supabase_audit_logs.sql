create extension if not exists pgcrypto;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_user_id uuid references public.users(id) on delete set null,
  actor_email text,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  table_name text not null,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  request_metadata jsonb not null default '{}'::jsonb
);

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_actor_user_id_idx on public.audit_logs (actor_user_id);
create index if not exists audit_logs_table_name_idx on public.audit_logs (table_name);
create index if not exists audit_logs_action_idx on public.audit_logs (action);

alter table public.audit_logs enable row level security;

drop policy if exists "Admins can read audit logs" on public.audit_logs;
create policy "Admins can read audit logs"
on public.audit_logs for select
using (
  exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
);

drop policy if exists "No client writes to audit logs" on public.audit_logs;
create policy "No client writes to audit logs"
on public.audit_logs for all
using (false)
with check (false);

create or replace function public.audit_log_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data jsonb;
  request_headers jsonb;
begin
  if tg_table_name = 'audit_logs' then
    return coalesce(new, old);
  end if;

  row_data := to_jsonb(coalesce(new, old));

  begin
    request_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    request_headers := '{}'::jsonb;
  end;

  insert into public.audit_logs (
    actor_user_id,
    actor_email,
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    request_metadata
  )
  values (
    auth.uid(),
    nullif(auth.jwt() ->> 'email', ''),
    tg_op,
    tg_table_name,
    coalesce(row_data ->> 'id', row_data ->> 'user_id', row_data ->> 'project_id'),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end,
    jsonb_build_object(
      'method', request_headers ->> 'x-forwarded-method',
      'ip', request_headers ->> 'x-forwarded-for',
      'user_agent', request_headers ->> 'user-agent'
    )
  );

  return coalesce(new, old);
end;
$$;

do $$
declare
  table_record record;
begin
  for table_record in
    select tablename
    from pg_tables
    where schemaname = 'public'
    and tablename <> 'audit_logs'
  loop
    execute format('drop trigger if exists audit_%I_changes on public.%I', table_record.tablename, table_record.tablename);
    execute format(
      'create trigger audit_%I_changes after insert or update or delete on public.%I for each row execute function public.audit_log_changes()',
      table_record.tablename,
      table_record.tablename
    );
  end loop;
end;
$$;
