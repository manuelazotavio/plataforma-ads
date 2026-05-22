create table if not exists public.event_comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  parent_id uuid references public.event_comments(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.event_comments enable row level security;

create policy "Anyone can read event comments"
on public.event_comments for select
using (true);

create policy "Users can create own event comments"
on public.event_comments for insert
with check (auth.uid() = user_id);

create policy "Users can delete own event comments"
on public.event_comments for delete
using (auth.uid() = user_id);

create table if not exists public.event_comment_reactions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.event_comments(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  reaction_type text not null,
  created_at timestamptz not null default now(),
  unique (comment_id, user_id)
);

alter table public.event_comment_reactions enable row level security;

create policy "Anyone can read event comment reactions"
on public.event_comment_reactions for select
using (true);

create policy "Users can manage own event comment reactions"
on public.event_comment_reactions for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
