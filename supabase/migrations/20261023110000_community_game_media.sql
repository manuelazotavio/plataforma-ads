create table if not exists public.community_game_media (
  id            uuid        primary key default gen_random_uuid(),
  game_id       uuid        not null references public.community_games(id) on delete cascade,
  url           text        not null,
  media_type    text        not null check (media_type in ('image', 'video')),
  display_order integer     not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists community_game_media_game_id_idx on public.community_game_media (game_id, display_order);

alter table public.community_game_media enable row level security;

-- A visibilidade herda da RLS de community_games (aprovado, dono ou admin).
drop policy if exists "community_game_media_select" on public.community_game_media;
create policy "community_game_media_select"
  on public.community_game_media for select
  using (exists (select 1 from public.community_games g where g.id = game_id));

drop policy if exists "community_game_media_insert" on public.community_game_media;
create policy "community_game_media_insert"
  on public.community_game_media for insert
  with check (
    exists (select 1 from public.community_games g where g.id = game_id and g.user_id = auth.uid())
  );

-- Migra a mídia única que já existia antes de remover as colunas.
insert into public.community_game_media (game_id, url, media_type, display_order)
select id, media_url, media_type, 0
from public.community_games
where media_url is not null and media_type is not null
  and not exists (select 1 from public.community_game_media m where m.game_id = community_games.id);

alter table public.community_games drop column if exists media_url;
alter table public.community_games drop column if exists media_type;
