

CREATE TABLE IF NOT EXISTS public.levels (
  id          serial  PRIMARY KEY,
  name        text    NOT NULL,
  min_xp      integer NOT NULL DEFAULT 0,
  description text
);

ALTER TABLE public.levels
  ADD COLUMN IF NOT EXISTS description text;

INSERT INTO public.levels (name, min_xp, description) VALUES
  ('Iniciante',    0,    'Comecou a participar da comunidade e esta dando os primeiros passos.'),
  ('Explorador',   100,  'Ja publicou ou interagiu algumas vezes e esta conhecendo melhor a plataforma.'),
  ('Colaborador',  250,  'Contribui com projetos, artigos, topicos ou comentarios com frequencia.'),
  ('Desbravador',  500,  'Participa ativamente e ajuda a movimentar discussoes e conteudos da comunidade.'),
  ('Veterano',     900,  'Tem historico consistente de contribuicoes relevantes na plataforma.'),
  ('Especialista', 1400, 'E uma referencia de participacao, conhecimento e colaboracao na comunidade.')
ON CONFLICT DO NOTHING;

UPDATE public.levels SET description = 'Comecou a participar da comunidade e esta dando os primeiros passos.' WHERE name = 'Iniciante' AND description IS NULL;
UPDATE public.levels SET description = 'Ja publicou ou interagiu algumas vezes e esta conhecendo melhor a plataforma.' WHERE name = 'Explorador' AND description IS NULL;
UPDATE public.levels SET description = 'Contribui com projetos, artigos, topicos ou comentarios com frequencia.' WHERE name = 'Colaborador' AND description IS NULL;
UPDATE public.levels SET description = 'Participa ativamente e ajuda a movimentar discussoes e conteudos da comunidade.' WHERE name = 'Desbravador' AND description IS NULL;
UPDATE public.levels SET description = 'Tem historico consistente de contribuicoes relevantes na plataforma.' WHERE name = 'Veterano' AND description IS NULL;
UPDATE public.levels SET description = 'E uma referencia de participacao, conhecimento e colaboracao na comunidade.' WHERE name = 'Especialista' AND description IS NULL;

ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view levels"
  ON public.levels FOR SELECT USING (true);

CREATE POLICY "Admin can manage levels"
  ON public.levels FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));
