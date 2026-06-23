
create table forum_polls (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references forum_topics(id) on delete cascade,
  question text not null,
  allows_multiple boolean not null default false,
  created_at timestamptz not null default now()
);

create table forum_poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references forum_polls(id) on delete cascade,
  text text not null,
  display_order integer not null default 0
);

create table forum_poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references forum_polls(id) on delete cascade,
  option_id uuid not null references forum_poll_options(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(option_id, user_id)
);


create index forum_poll_votes_poll_user on forum_poll_votes(poll_id, user_id);


alter table forum_polls enable row level security;
alter table forum_poll_options enable row level security;
alter table forum_poll_votes enable row level security;


create policy "Anyone can read polls"
  on forum_polls for select using (true);

create policy "Topic owner can create poll"
  on forum_polls for insert
  with check (auth.uid() = (select user_id from forum_topics where id = topic_id));


create policy "Anyone can read poll options"
  on forum_poll_options for select using (true);

create policy "Poll owner can create options"
  on forum_poll_options for insert
  with check (
    auth.uid() = (
      select t.user_id
      from forum_polls p
      join forum_topics t on t.id = p.topic_id
      where p.id = poll_id
    )
  );


create policy "Anyone can read poll votes"
  on forum_poll_votes for select using (true);

create policy "Authenticated users can vote"
  on forum_poll_votes for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own votes"
  on forum_poll_votes for delete
  using (auth.uid() = user_id);
