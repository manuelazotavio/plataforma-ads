with lucas_alves as (
  select id
  from public.users
  where name ilike 'Lucas Alves'
  order by name
  limit 1
)
update public.professors
set photo_credit_user_id = (select id from lucas_alves)
where avatar_url is not null
  and (select id from lucas_alves) is not null;
