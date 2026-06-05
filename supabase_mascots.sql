
CREATE TABLE IF NOT EXISTS public.mascots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  description   text,
  image_url     text NOT NULL,
  min_xp        integer NOT NULL DEFAULT 0,
  display_order integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS selected_mascot_id uuid REFERENCES public.mascots(id) ON DELETE SET NULL;


ALTER TABLE public.mascots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mascots_read"  ON public.mascots FOR SELECT USING (true);
CREATE POLICY "mascots_admin" ON public.mascots FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));


INSERT INTO public.mascots (name, description, image_url, min_xp, display_order)
VALUES ('ADS Bot', 'O assistente oficial da comunidade ADS. Sempre online, sempre animado!', '/mascote.png', 0, 1)
ON CONFLICT DO NOTHING;
