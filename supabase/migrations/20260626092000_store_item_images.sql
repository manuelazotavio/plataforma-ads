alter table public.store_items
  add column if not exists images text[];
