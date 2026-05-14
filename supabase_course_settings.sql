create table if not exists public.course_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

alter table public.course_settings enable row level security;

drop policy if exists "Anyone can read course settings" on public.course_settings;
create policy "Anyone can read course settings"
on public.course_settings for select
using (true);

drop policy if exists "Admins can manage course settings" on public.course_settings;
create policy "Admins can manage course settings"
on public.course_settings for all
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

insert into storage.buckets (id, name, public)
values ('course-documents', 'course-documents', true)
on conflict (id) do update set public = true;

drop policy if exists "Anyone can read course documents" on storage.objects;
create policy "Anyone can read course documents"
on storage.objects for select
using (bucket_id = 'course-documents');

drop policy if exists "Admins can upload course documents" on storage.objects;
create policy "Admins can upload course documents"
on storage.objects for insert
with check (
  bucket_id = 'course-documents'
  and exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
);

drop policy if exists "Admins can update course documents" on storage.objects;
create policy "Admins can update course documents"
on storage.objects for update
using (
  bucket_id = 'course-documents'
  and exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
)
with check (
  bucket_id = 'course-documents'
  and exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
);

drop policy if exists "Admins can delete course documents" on storage.objects;
create policy "Admins can delete course documents"
on storage.objects for delete
using (
  bucket_id = 'course-documents'
  and exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
);
