create table if not exists public.course_schedule_documents (
  id            uuid        primary key default gen_random_uuid(),
  label         text        not null,
  url           text        not null,
  is_active     boolean     not null default true,
  display_order int         not null default 0,
  created_at    timestamptz not null default now()
);

alter table public.course_schedule_documents enable row level security;

drop policy if exists "course_schedule_documents_select" on public.course_schedule_documents;
create policy "course_schedule_documents_select"
  on public.course_schedule_documents for select using (true);

drop policy if exists "course_schedule_documents_admin" on public.course_schedule_documents;
create policy "course_schedule_documents_admin"
  on public.course_schedule_documents for all
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
