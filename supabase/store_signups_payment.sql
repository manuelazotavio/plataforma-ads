
ALTER TABLE public.store_items
  ADD COLUMN IF NOT EXISTS pix_key text,
  ADD COLUMN IF NOT EXISTS deposit_percent integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS whatsapp_contact text;

ALTER TABLE public.store_signups DROP CONSTRAINT IF EXISTS store_signups_status_check;
ALTER TABLE public.store_signups ADD CONSTRAINT store_signups_status_check
  CHECK (status IN ('awaiting_payment', 'active', 'cancelled', 'confirmed'));
