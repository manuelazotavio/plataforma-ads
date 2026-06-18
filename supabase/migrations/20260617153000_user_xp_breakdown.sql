create or replace function public.get_user_xp_breakdown(p_user_id uuid)
returns table (
  label text,
  detail text,
  xp integer
)
language sql
security definer
set search_path = public
stable
as $$
  with user_data as (
    select
      u.id,
      case when nullif(trim(coalesce(u.avatar_url, '')), '') is not null then 15 else 0 end as avatar_xp,
      case when nullif(trim(coalesce(u.bio, '')), '') is not null then 15 else 0 end as bio_xp,
      (
        case when nullif(trim(coalesce(u.github_url, '')), '') is not null then 1 else 0 end +
        case when nullif(trim(coalesce(u.linkedin_url, '')), '') is not null then 1 else 0 end +
        case when nullif(trim(coalesce(u.portfolio_url, '')), '') is not null then 1 else 0 end
      ) as links_count
    from public.users u
    where u.id = p_user_id
  ),
  values_by_source as (
    select
      1 as display_order,
      count(*)::integer as item_count,
      50 as unit_xp,
      (count(*) * 50)::integer as source_xp,
      'projeto publicado'::text as singular_label,
      'projetos publicados'::text as plural_label
    from public.projects
    where user_id = p_user_id and approved = true

    union all

    select
      2,
      count(*)::integer,
      40,
      (count(*) * 40)::integer,
      'artigo publicado',
      'artigos publicados'
    from public.articles
    where user_id = p_user_id and status = 'publicado'

    union all

    select
      3,
      count(*)::integer,
      20,
      (count(*) * 20)::integer,
      'tópico criado',
      'tópicos criados'
    from public.forum_topics
    where user_id = p_user_id

    union all

    select
      4,
      (
        (select count(*) from public.project_comments where user_id = p_user_id) +
        (select count(*) from public.article_comments where user_id = p_user_id)
      )::integer,
      10,
      (
        (
          (select count(*) from public.project_comments where user_id = p_user_id) +
          (select count(*) from public.article_comments where user_id = p_user_id)
        ) * 10
      )::integer,
      'comentário feito',
      'comentários feitos'

    union all

    select
      5,
      (
        coalesce((select sum(coalesce(like_count, 0)) from public.projects where user_id = p_user_id and approved = true), 0) +
        coalesce((select sum(coalesce(like_count, 0)) from public.articles where user_id = p_user_id and status = 'publicado'), 0)
      )::integer,
      5,
      (
        (
          coalesce((select sum(coalesce(like_count, 0)) from public.projects where user_id = p_user_id and approved = true), 0) +
          coalesce((select sum(coalesce(like_count, 0)) from public.articles where user_id = p_user_id and status = 'publicado'), 0)
        ) * 5
      )::integer,
      'curtida recebida',
      'curtidas recebidas'
  ),
  breakdown as (
    select
      display_order,
      concat(item_count, ' ', case when item_count = 1 then singular_label else plural_label end) as label,
      concat(item_count, ' × ', unit_xp) as detail,
      source_xp as xp
    from values_by_source

    union all

    select 6, 'Foto de perfil', null, avatar_xp from user_data
    union all
    select 7, 'Bio preenchida', null, bio_xp from user_data
    union all
    select 8, concat(links_count, ' ', case when links_count = 1 then 'link de perfil' else 'links de perfil' end),
      concat(links_count, ' × 10'), links_count * 10
    from user_data
    union all
    select 9, 'Missões concluídas', null,
      coalesce((select sum(coalesce(mc.xp, 0))::integer from public.mission_completions mc where mc.user_id = p_user_id), 0)
  )
  select breakdown.label, breakdown.detail, breakdown.xp
  from breakdown
  where breakdown.xp > 0
  order by display_order;
$$;

revoke all on function public.get_user_xp_breakdown(uuid) from public;
grant execute on function public.get_user_xp_breakdown(uuid) to authenticated;
