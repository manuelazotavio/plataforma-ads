
CREATE TABLE IF NOT EXISTS public.store_seller_profiles (
  user_id         uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  whatsapp        text,
  pix_key         text,
  deposit_percent integer NOT NULL DEFAULT 50,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_seller_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read seller profiles" ON public.store_seller_profiles;
CREATE POLICY "Anyone can read seller profiles"
  ON public.store_seller_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage seller profiles" ON public.store_seller_profiles;
CREATE POLICY "Admins can manage seller profiles"
  ON public.store_seller_profiles FOR ALL
  USING  (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));


ALTER TABLE public.store_items
  ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES public.users(id) ON DELETE SET NULL;


ALTER TABLE public.store_items DROP COLUMN IF EXISTS pix_key;
ALTER TABLE public.store_items DROP COLUMN IF EXISTS whatsapp_contact;
ALTER TABLE public.store_items DROP COLUMN IF EXISTS deposit_percent;
