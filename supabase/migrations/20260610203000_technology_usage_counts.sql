create or replace function public.get_technology_usage_counts()
returns table (
  tag_name text,
  usage_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    lower(trim(usage.tag_name)) as tag_name,
    count(*)::bigint as usage_count
  from (
    select tag_name from public.project_tags
    union all
    select tag_name from public.article_tags
    union all
    select skill_name as tag_name from public.user_skills
    union all
    select tag_name from public.job_tags
  ) usage
  where exists (
    select 1
    from public.users
    where users.id = auth.uid()
      and users.role = 'admin'
  )
    and trim(usage.tag_name) <> ''
  group by lower(trim(usage.tag_name));
$$;

revoke all on function public.get_technology_usage_counts() from public;
grant execute on function public.get_technology_usage_counts() to authenticated;
