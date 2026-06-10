alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (
    type in (
      'comment',
      'reply',
      'comment_reply',
      'reaction',
      'comment_reaction',
      'mention',
      'event_reminder',
      'review_request',
      'content_approved',
      'content_rejected'
    )
  );

create or replace function public.notify_project_review_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    tg_op = 'INSERT'
    and new.approved = false
    and new.rejection_message is null
  ) or (
    tg_op = 'UPDATE'
    and new.approved = false
    and new.rejection_message is null
    and (old.approved = true or old.rejection_message is not null)
  ) then
    insert into notifications (user_id, actor_id, type, target_type, target_id, target_title)
    select id, new.user_id, 'review_request', 'project', new.id, new.title
    from users
    where role = 'admin' and id <> new.user_id;
  end if;

  if tg_op = 'UPDATE' and new.approved = true and old.approved = false then
    insert into notifications (user_id, actor_id, type, target_type, target_id, target_title)
    values (new.user_id, auth.uid(), 'content_approved', 'project', new.id, new.title);
  elsif (
    tg_op = 'UPDATE'
    and new.approved = false
    and new.rejection_message is not null
    and old.rejection_message is distinct from new.rejection_message
  ) then
    insert into notifications (user_id, actor_id, type, target_type, target_id, target_title)
    values (new.user_id, auth.uid(), 'content_rejected', 'project', new.id, new.title);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_project_review_changes on public.projects;
create trigger trg_notify_project_review_changes
  after insert or update on public.projects
  for each row execute function public.notify_project_review_changes();

create or replace function public.notify_article_review_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    tg_op = 'INSERT'
    and new.status = 'pendente'
  ) or (
    tg_op = 'UPDATE'
    and new.status = 'pendente'
    and old.status is distinct from 'pendente'
  ) then
    insert into notifications (user_id, actor_id, type, target_type, target_id, target_title)
    select id, new.user_id, 'review_request', 'article', new.id, new.title
    from users
    where role = 'admin' and id <> new.user_id;
  end if;

  if tg_op = 'UPDATE' and new.status = 'publicado' and old.status is distinct from 'publicado' then
    insert into notifications (user_id, actor_id, type, target_type, target_id, target_title)
    values (new.user_id, auth.uid(), 'content_approved', 'article', new.id, new.title);
  elsif tg_op = 'UPDATE' and new.status = 'rejeitado' and old.status is distinct from 'rejeitado' then
    insert into notifications (user_id, actor_id, type, target_type, target_id, target_title)
    values (new.user_id, auth.uid(), 'content_rejected', 'article', new.id, new.title);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_article_review_changes on public.articles;
create trigger trg_notify_article_review_changes
  after insert or update on public.articles
  for each row execute function public.notify_article_review_changes();
