alter table public.users
  add column if not exists xp integer not null default 0;

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
      coalesce((select sum(coalesce(xp, 0))::integer from public.mission_completions where user_id = p_user_id), 0)
    )
  into total
  from public.users u
  where u.id = p_user_id;

  return coalesce(total, 0);
end;
$$;

create or replace function public.refresh_user_xp(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_xp integer;
begin
  if p_user_id is null then
    return 0;
  end if;

  new_xp := public.calculate_user_xp(p_user_id);

  update public.users
  set xp = new_xp
  where id = p_user_id
    and xp is distinct from new_xp;

  return new_xp;
end;
$$;

create or replace function public.refresh_user_xp_from_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_user_xp(new.id);
  return new;
end;
$$;

create or replace function public.refresh_user_xp_from_content()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_user_xp(old.user_id);
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_user_xp(new.user_id);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_refresh_user_xp_profile on public.users;
create trigger trg_refresh_user_xp_profile
after insert or update of avatar_url, bio, github_url, linkedin_url, portfolio_url
on public.users
for each row
execute function public.refresh_user_xp_from_user();

drop trigger if exists trg_refresh_user_xp_projects on public.projects;
create trigger trg_refresh_user_xp_projects
after insert or update of user_id, approved, like_count or delete
on public.projects
for each row
execute function public.refresh_user_xp_from_content();

drop trigger if exists trg_refresh_user_xp_articles on public.articles;
create trigger trg_refresh_user_xp_articles
after insert or update of user_id, status, like_count or delete
on public.articles
for each row
execute function public.refresh_user_xp_from_content();

drop trigger if exists trg_refresh_user_xp_forum_topics on public.forum_topics;
create trigger trg_refresh_user_xp_forum_topics
after insert or update of user_id or delete
on public.forum_topics
for each row
execute function public.refresh_user_xp_from_content();

drop trigger if exists trg_refresh_user_xp_project_comments on public.project_comments;
create trigger trg_refresh_user_xp_project_comments
after insert or update of user_id or delete
on public.project_comments
for each row
execute function public.refresh_user_xp_from_content();

drop trigger if exists trg_refresh_user_xp_article_comments on public.article_comments;
create trigger trg_refresh_user_xp_article_comments
after insert or update of user_id or delete
on public.article_comments
for each row
execute function public.refresh_user_xp_from_content();

drop trigger if exists trg_refresh_user_xp_mission_completions on public.mission_completions;
create trigger trg_refresh_user_xp_mission_completions
after insert or update of user_id, xp or delete
on public.mission_completions
for each row
execute function public.refresh_user_xp_from_content();

update public.users
set xp = public.calculate_user_xp(id);
