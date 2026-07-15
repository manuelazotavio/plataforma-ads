alter table public.notifications add column if not exists message text;
alter table public.notifications add column if not exists link_url text;
alter table public.notifications alter column target_id drop not null;

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
      'content_rejected',
      'admin_announcement'
    )
  );

alter table public.notifications
  drop constraint if exists notifications_target_type_check;

alter table public.notifications
  add constraint notifications_target_type_check
  check (
    target_type is null
    or target_type in ('article', 'project', 'forum_topic', 'event', 'announcement')
  );

create table if not exists public.admin_announcements (
  id             uuid        primary key default gen_random_uuid(),
  admin_id       uuid        not null references public.users(id),
  title          text        not null,
  message        text        not null,
  link_url       text,
  recipient_type text        not null check (recipient_type in ('all', 'user')),
  recipient_id   uuid        references public.users(id),
  recipient_count int        not null default 0,
  sent_at        timestamptz not null default now()
);

alter table public.admin_announcements enable row level security;

drop policy if exists "admin_announcements_admin" on public.admin_announcements;
create policy "admin_announcements_admin" on public.admin_announcements for all
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
