
alter table public.forum_topics
  add column if not exists is_closed boolean not null default false;


create policy "Author or moderator can close topic"
on public.forum_topics for update
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.users
    where id = auth.uid()
    and role in ('admin', 'moderador')
  )
)
with check (
  auth.uid() = user_id
  or exists (
    select 1 from public.users
    where id = auth.uid()
    and role in ('admin', 'moderador')
  )
);
