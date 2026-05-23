
drop policy if exists "Author or moderator can delete topic" on public.forum_topics;
create policy "Author or moderator can delete topic"
on public.forum_topics for delete
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.users
    where id = auth.uid()
    and role in ('admin', 'moderador')
  )
);
