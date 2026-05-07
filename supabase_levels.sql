

CREATE TABLE IF NOT EXISTS public.levels (
  id     serial  PRIMARY KEY,
  name   text    NOT NULL,
  min_xp integer NOT NULL DEFAULT 0
);


INSERT INTO public.levels (name, min_xp) VALUES
  ('Iniciante',    0),
  ('Explorador',   100),
  ('Colaborador',  250),
  ('Desbravador',  500),
  ('Veterano',     900),
  ('Especialista', 1400);

ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view levels"
  ON public.levels FOR SELECT USING (true);

CREATE POLICY "Admin can manage levels"
  ON public.levels FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));
