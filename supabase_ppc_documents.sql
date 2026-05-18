CREATE TABLE course_ppc_documents (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  label         text        NOT NULL,
  url           text        NOT NULL,
  display_order int         NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE course_ppc_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de PPCs" ON course_ppc_documents
  FOR SELECT USING (true);

CREATE POLICY "Admins gerenciam PPCs" ON course_ppc_documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
