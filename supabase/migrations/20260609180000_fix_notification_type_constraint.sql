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
      'event_reminder'
    )
  );

alter table public.notifications
  drop constraint if exists notifications_target_type_check;

alter table public.notifications
  add constraint notifications_target_type_check
  check (target_type in ('article', 'project', 'forum_topic', 'event'));
