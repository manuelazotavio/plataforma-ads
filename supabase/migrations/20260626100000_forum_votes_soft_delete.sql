

alter table public.forum_topic_votes
  add column if not exists is_voted boolean not null default true;

alter table public.forum_reply_votes
  add column if not exists is_voted boolean not null default true;

alter table public.forum_topic_votes
  drop constraint if exists forum_topic_votes_user_id_topic_id_key;
alter table public.forum_topic_votes
  add constraint forum_topic_votes_user_id_topic_id_key unique (user_id, topic_id);

alter table public.forum_reply_votes
  drop constraint if exists forum_reply_votes_user_id_reply_id_key;
alter table public.forum_reply_votes
  add constraint forum_reply_votes_user_id_reply_id_key unique (user_id, reply_id);
