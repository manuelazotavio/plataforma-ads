

CREATE TABLE IF NOT EXISTS public.mascot_reactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mascot_id   uuid NOT NULL REFERENCES public.mascots(id) ON DELETE CASCADE,
  target_type text NOT NULL, 
  target_id   uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mascot_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS mascot_reactions_target_idx ON mascot_reactions (target_type, target_id);
CREATE INDEX IF NOT EXISTS mascot_reactions_user_idx   ON mascot_reactions (user_id);

ALTER TABLE mascot_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de reações de mascote"
  ON mascot_reactions FOR SELECT USING (true);

CREATE POLICY "Usuário gerencia suas próprias reações de mascote"
  ON mascot_reactions FOR ALL USING (auth.uid() = user_id);
