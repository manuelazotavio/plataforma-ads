
CREATE TABLE event_likes (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id      uuid        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

ALTER TABLE event_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de reações" ON event_likes
  FOR SELECT USING (true);

CREATE POLICY "Usuário gerencia própria reação" ON event_likes
  FOR ALL USING (auth.uid() = user_id);
