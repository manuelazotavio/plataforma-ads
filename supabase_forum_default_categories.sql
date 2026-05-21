

insert into public.forum_categories (name, description, display_order)
select 'Geral', 'Discussões gerais sobre o curso e a comunidade.', 1
where not exists (
  select 1 from public.forum_categories
);
