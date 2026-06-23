
create table public.game_scores (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.users(id) on delete cascade,
  game_id    text        not null,
  score      integer     not null default 0,
  updated_at timestamptz not null default now(),
  unique(user_id, game_id)
);

create index game_scores_game_score on public.game_scores(game_id, score desc);

alter table public.game_scores enable row level security;

create policy "Anyone can read game scores"
  on public.game_scores for select using (true);

create policy "Users can insert own score"
  on public.game_scores for insert
  with check (auth.uid() = user_id);

create policy "Users can update own score"
  on public.game_scores for update
  using (auth.uid() = user_id);

create or replace function public.calculate_user_xp(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  total integer := 0;
begin
  if p_user_id is null then
    return 0;
  end if;

  select
    (
      (select count(*)::integer * 50 from public.projects where user_id = p_user_id and approved = true) +
      (select count(*)::integer * 40 from public.articles where user_id = p_user_id and status = 'publicado') +
      (select count(*)::integer * 20 from public.forum_topics where user_id = p_user_id) +
      (
        (
          (select count(*)::integer from public.project_comments where user_id = p_user_id) +
          (select count(*)::integer from public.article_comments where user_id = p_user_id)
        ) * 10
      ) +
      (
        (
          coalesce((select sum(coalesce(like_count, 0))::integer from public.projects where user_id = p_user_id and approved = true), 0) +
          coalesce((select sum(coalesce(like_count, 0))::integer from public.articles where user_id = p_user_id and status = 'publicado'), 0)
        ) * 5
      ) +
      case when nullif(trim(coalesce(u.avatar_url, '')), '') is not null then 15 else 0 end +
      case when nullif(trim(coalesce(u.bio, '')), '') is not null then 15 else 0 end +
      (
        (
          case when nullif(trim(coalesce(u.github_url, '')), '') is not null then 1 else 0 end +
          case when nullif(trim(coalesce(u.linkedin_url, '')), '') is not null then 1 else 0 end +
          case when nullif(trim(coalesce(u.portfolio_url, '')), '') is not null then 1 else 0 end
        ) * 10
      ) +
      coalesce((select sum(coalesce(xp, 0))::integer from public.mission_completions where user_id = p_user_id), 0) +
      coalesce((select sum(least(50, floor(score::float / 10)::integer)) from public.game_scores where user_id = p_user_id), 0)
    )
  into total
  from public.users u
  where u.id = p_user_id;

  return coalesce(total, 0);
end;
$$;


create or replace function public.refresh_user_xp_from_game_score()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.refresh_user_xp(coalesce(new.user_id, old.user_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_refresh_user_xp_game_scores on public.game_scores;
create trigger trg_refresh_user_xp_game_scores
  after insert or update of score or delete
  on public.game_scores
  for each row execute function public.refresh_user_xp_from_game_score();

update public.users set xp = public.calculate_user_xp(id);
