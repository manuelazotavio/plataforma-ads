
CREATE TABLE event_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  value text NOT NULL UNIQUE,
  label text NOT NULL,
  "order" smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);


INSERT INTO event_categories (value, label, "order") VALUES
  ('hackathon',            'Hackathon',             0),
  ('maratona',             'Maratona',              1),
  ('extensao',             'Extensão',              2),
  ('iniciacao_cientifica', 'Iniciação Científica',  3);

ALTER TABLE event_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública" ON event_categories
  FOR SELECT USING (true);

CREATE POLICY "Escrita autenticada" ON event_categories
  FOR ALL USING (auth.role() = 'authenticated');
