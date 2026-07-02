
alter table public.articles enable row level security;

drop policy if exists "articles_select_admin" on public.articles;
create policy "articles_select_admin"
  on public.articles
  for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );
