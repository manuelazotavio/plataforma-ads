
CREATE TABLE curriculum_versions (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text        NOT NULL,
  year        int         NOT NULL,
  description text,
  is_current  boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE curriculum_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de versões" ON curriculum_versions
  FOR SELECT USING (true);

CREATE POLICY "Admins gerenciam versões" ON curriculum_versions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

ALTER TABLE curriculum_subjects
  ADD COLUMN IF NOT EXISTS version_id uuid REFERENCES curriculum_versions(id) ON DELETE SET NULL;

CREATE TABLE curriculum_equivalency_groups (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  from_subject_id uuid        NOT NULL REFERENCES curriculum_subjects(id) ON DELETE CASCADE,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE curriculum_equivalency_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de grupos de equivalência" ON curriculum_equivalency_groups
  FOR SELECT USING (true);

CREATE POLICY "Admins gerenciam grupos de equivalência" ON curriculum_equivalency_groups
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE TABLE curriculum_equivalency_members (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id        uuid NOT NULL REFERENCES curriculum_equivalency_groups(id) ON DELETE CASCADE,
  to_subject_id   uuid NOT NULL REFERENCES curriculum_subjects(id) ON DELETE CASCADE,
  UNIQUE (group_id, to_subject_id)
);

ALTER TABLE curriculum_equivalency_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de membros de equivalência" ON curriculum_equivalency_members
  FOR SELECT USING (true);

CREATE POLICY "Admins gerenciam membros de equivalência" ON curriculum_equivalency_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
