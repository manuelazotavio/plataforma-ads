alter table public.egressos enable row level security;

drop policy if exists "Anyone can read active egressos" on public.egressos;
create policy "Anyone can read active egressos"
on public.egressos for select
using (is_active = true);

drop policy if exists "Admins can read all egressos" on public.egressos;
create policy "Admins can read all egressos"
on public.egressos for select
using (
  exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
);

drop policy if exists "Admins can manage egressos" on public.egressos;
create policy "Admins can manage egressos"
on public.egressos for all
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

drop policy if exists "Users can manage own egresso" on public.egressos;
create policy "Users can manage own egresso"
on public.egressos for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "Admins can upload egresso avatars" on storage.objects;
create policy "Admins can upload egresso avatars"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = 'egressos'
  and exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
);

drop policy if exists "Admins can update egresso avatars" on storage.objects;
create policy "Admins can update egresso avatars"
on storage.objects for update
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = 'egressos'
  and exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = 'egressos'
  and exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
);
