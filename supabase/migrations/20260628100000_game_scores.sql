create table if not exists public.game_scores (
  user_id    uuid        not null references public.users(id) on delete cascade,
  game_id    text        not null,
  score      integer     not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

alter table public.game_scores enable row level security;

create policy "game_scores_select_own"
  on public.game_scores for select
  using (auth.uid() = user_id);

create policy "game_scores_upsert_own"
  on public.game_scores for insert
  with check (auth.uid() = user_id);

create policy "game_scores_update_own"
  on public.game_scores for update
  using (auth.uid() = user_id);
