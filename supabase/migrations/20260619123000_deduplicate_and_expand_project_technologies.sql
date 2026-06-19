-- Consolida nomes equivalentes sem perder as tags já usadas pelos projetos.
do $$
declare
  item text[];
  aliases text[][] := array[
    array['API REST', 'REST API'],
    array['Node', 'Node.js'],
    array['Javascript', 'JavaScript'],
    array['Typescript', 'TypeScript'],
    array['TailwindCSS', 'Tailwind CSS'],
    array['PostgresSQL', 'PostgreSQL'],
    array['BeautifulSoup', 'BeautifulSoup4'],
    array['Rails', 'Ruby on Rails'],
    array['AI', 'IA'],
    array['NextJS', 'Next.js'],
    array['React Query', 'TanStack Query'],
    array['React Table', 'TanStack Table']
  ];
begin
  foreach item slice 1 in array aliases loop
    insert into public.project_tag_options (name, display_order, is_active)
    values (
      item[2],
      coalesce((select max(display_order) + 1 from public.project_tag_options), 1),
      true
    )
    on conflict (name) do update set is_active = true;

    update public.project_tags
    set tag_name = item[2]
    where lower(tag_name) = lower(item[1]);

    delete from public.project_tag_options
    where lower(name) = lower(item[1])
      and name <> item[2];
  end loop;
end
$$;

delete from public.project_tags target
using (
  select id
  from (
    select
      id,
      row_number() over (
        partition by project_id, lower(trim(tag_name))
        order by id
      ) as position
    from public.project_tags
  ) ranked
  where position > 1
) duplicate
where target.id = duplicate.id;

with additions(name) as (
  values
    ('Axios'),
    ('Lodash'),
    ('date-fns'),
    ('TanStack Query'),
    ('TanStack Table'),
    ('Drizzle ORM'),
    ('TypeORM'),
    ('Sequelize'),
    ('Mongoose'),
    ('Auth.js'),
    ('tRPC'),
    ('bcrypt'),
    ('dotenv'),
    ('Polars'),
    ('HTTPX'),
    ('Dask'),
    ('Jupyter'),
    ('Alembic'),
    ('Cryptography'),
    ('Gson'),
    ('SLF4J'),
    ('Log4j'),
    ('Apache Commons'),
    ('Guava'),
    ('Serilog'),
    ('Newtonsoft.Json'),
    ('Guzzle'),
    ('Carbon')
),
numbered as (
  select
    name,
    row_number() over (order by name) as position,
    coalesce((select max(display_order) from public.project_tag_options), 0) as current_max
  from additions
)
insert into public.project_tag_options (name, display_order, is_active)
select name, current_max + position, true
from numbered
on conflict (name) do update set is_active = true;
