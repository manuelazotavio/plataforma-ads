alter table public.store_items
  add column if not exists collective_fields jsonb,
  add column if not exists collective_info    text;
