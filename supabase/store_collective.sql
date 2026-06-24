
ALTER TABLE public.store_items
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS min_quantity integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS sizes text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.store_items
  DROP CONSTRAINT IF EXISTS store_items_type_check;
ALTER TABLE public.store_items
  ADD CONSTRAINT store_items_type_check
  CHECK (type IN ('normal', 'collective'));


CREATE TABLE IF NOT EXISTS public.store_signups (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id    uuid NOT NULL REFERENCES public.store_items(id) ON DELETE CASCADE,
  size       text,
  status     text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id)
);

ALTER TABLE public.store_signups ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.store_signups
  DROP CONSTRAINT IF EXISTS store_signups_status_check;
ALTER TABLE public.store_signups
  ADD CONSTRAINT store_signups_status_check
  CHECK (status IN ('active', 'cancelled', 'confirmed'));

DROP POLICY IF EXISTS "Anyone can read signups" ON public.store_signups;
CREATE POLICY "Anyone can read signups"
  ON public.store_signups FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own signups" ON public.store_signups;
CREATE POLICY "Users can insert own signups"
  ON public.store_signups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own signups" ON public.store_signups;
CREATE POLICY "Users can update own signups"
  ON public.store_signups FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update all signups" ON public.store_signups;
CREATE POLICY "Admins can update all signups"
  ON public.store_signups FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));


CREATE TABLE IF NOT EXISTS public.store_orders (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  items      jsonb NOT NULL DEFAULT '[]'::jsonb,
  total      numeric(10,2) NOT NULL DEFAULT 0,
  status     text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.store_orders
  DROP CONSTRAINT IF EXISTS store_orders_status_check;
ALTER TABLE public.store_orders
  ADD CONSTRAINT store_orders_status_check
  CHECK (status IN ('pending', 'confirmed', 'delivered', 'cancelled'));

DROP POLICY IF EXISTS "Users can read own orders" ON public.store_orders;
CREATE POLICY "Users can read own orders"
  ON public.store_orders FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own orders" ON public.store_orders;
CREATE POLICY "Users can insert own orders"
  ON public.store_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all orders" ON public.store_orders;
CREATE POLICY "Admins can read all orders"
  ON public.store_orders FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can update orders" ON public.store_orders;
CREATE POLICY "Admins can update orders"
  ON public.store_orders FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
