drop policy if exists "Admins and moderators can delete project comments"
on public.project_comments;

create policy "Admins and moderators can delete project comments"
on public.project_comments
for delete
using (
  exists (
    select 1
    from public.users
    where users.id = auth.uid()
      and users.role in ('admin', 'moderador')
  )
);

drop policy if exists "Admins and moderators can delete article comments"
on public.article_comments;

create policy "Admins and moderators can delete article comments"
on public.article_comments
for delete
using (
  exists (
    select 1
    from public.users
    where users.id = auth.uid()
      and users.role in ('admin', 'moderador')
  )
);

drop policy if exists "Admins and moderators can delete event comments"
on public.event_comments;

create policy "Admins and moderators can delete event comments"
on public.event_comments
for delete
using (
  exists (
    select 1
    from public.users
    where users.id = auth.uid()
      and users.role in ('admin', 'moderador')
  )
);
