

insert into storage.buckets (id, name, public)
values ('forum-media', 'forum-media', true)
on conflict (id) do update set public = true;

drop policy if exists "Anyone can read article attachments" on storage.objects;
create policy "Anyone can read article attachments"
on storage.objects for select
using (
  bucket_id = 'forum-media'
  and (storage.foldername(name))[1] = 'articles'
);

drop policy if exists "Anyone can read forum attachments" on storage.objects;
create policy "Anyone can read forum attachments"
on storage.objects for select
using (
  bucket_id = 'forum-media'
  and (storage.foldername(name))[1] = 'forum'
);

drop policy if exists "Users can upload own article attachments" on storage.objects;
create policy "Users can upload own article attachments"
on storage.objects for insert
with check (
  bucket_id = 'forum-media'
  and auth.uid()::text = (storage.foldername(name))[2]
  and (storage.foldername(name))[1] = 'articles'
);

drop policy if exists "Users can upload own forum attachments" on storage.objects;
create policy "Users can upload own forum attachments"
on storage.objects for insert
with check (
  bucket_id = 'forum-media'
  and auth.uid()::text = (storage.foldername(name))[2]
  and (storage.foldername(name))[1] = 'forum'
);

drop policy if exists "Users can update own article attachments" on storage.objects;
create policy "Users can update own article attachments"
on storage.objects for update
using (
  bucket_id = 'forum-media'
  and auth.uid()::text = (storage.foldername(name))[2]
  and (storage.foldername(name))[1] = 'articles'
)
with check (
  bucket_id = 'forum-media'
  and auth.uid()::text = (storage.foldername(name))[2]
  and (storage.foldername(name))[1] = 'articles'
);

drop policy if exists "Users can update own forum attachments" on storage.objects;
create policy "Users can update own forum attachments"
on storage.objects for update
using (
  bucket_id = 'forum-media'
  and auth.uid()::text = (storage.foldername(name))[2]
  and (storage.foldername(name))[1] = 'forum'
)
with check (
  bucket_id = 'forum-media'
  and auth.uid()::text = (storage.foldername(name))[2]
  and (storage.foldername(name))[1] = 'forum'
);

drop policy if exists "Users can delete own article attachments" on storage.objects;
create policy "Users can delete own article attachments"
on storage.objects for delete
using (
  bucket_id = 'forum-media'
  and auth.uid()::text = (storage.foldername(name))[2]
  and (storage.foldername(name))[1] = 'articles'
);

drop policy if exists "Users can delete own forum attachments" on storage.objects;
create policy "Users can delete own forum attachments"
on storage.objects for delete
using (
  bucket_id = 'forum-media'
  and auth.uid()::text = (storage.foldername(name))[2]
  and (storage.foldername(name))[1] = 'forum'
);
