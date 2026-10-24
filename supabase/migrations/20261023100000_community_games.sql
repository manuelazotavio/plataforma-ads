create table if not exists public.community_games (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references public.users(id) on delete cascade,
  title             text        not null,
  about             text        not null,
  instructions      text        not null,
  executable_url    text        not null,
  executable_name   text,
  executable_size   bigint,
  media_url         text,
  media_type        text        check (media_type in ('image', 'video')),
  approved          boolean     not null default false,
  rejection_message text,
  created_at        timestamptz not null default now()
);

create index if not exists community_games_user_id_idx on public.community_games (user_id);
create index if not exists community_games_approved_idx on public.community_games (approved, created_at desc);

alter table public.community_games enable row level security;

drop policy if exists "community_games_select" on public.community_games;
create policy "community_games_select"
  on public.community_games for select
  using (
    approved
    or auth.uid() = user_id
    or exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- Quem não é admin só consegue enviar jogos pendentes de aprovação.
drop policy if exists "community_games_insert" on public.community_games;
create policy "community_games_insert"
  on public.community_games for insert
  with check (
    auth.uid() = user_id
    and (
      approved = false
      or exists (select 1 from public.users where id = auth.uid() and role = 'admin')
    )
  );

drop policy if exists "community_games_update_admin" on public.community_games;
create policy "community_games_update_admin"
  on public.community_games for update
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

drop policy if exists "community_games_delete" on public.community_games;
create policy "community_games_delete"
  on public.community_games for delete
  using (
    auth.uid() = user_id
    or exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

insert into storage.buckets (id, name, public, file_size_limit)
values ('games', 'games', true, 52428800)
on conflict (id) do update set public = true, file_size_limit = 52428800;

drop policy if exists "games_select" on storage.objects;
create policy "games_select" on storage.objects for select
using (bucket_id = 'games');

drop policy if exists "games_insert" on storage.objects;
create policy "games_insert" on storage.objects for insert
with check (
  bucket_id = 'games'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "games_delete" on storage.objects;
create policy "games_delete" on storage.objects for delete
using (
  bucket_id = 'games'
  and auth.uid()::text = (storage.foldername(name))[1]
);
