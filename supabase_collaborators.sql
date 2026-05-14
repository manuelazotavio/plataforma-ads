
CREATE TABLE IF NOT EXISTS public.project_collaborators (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_collaborators_project_idx
  ON public.project_collaborators (project_id);

CREATE INDEX IF NOT EXISTS project_collaborators_user_idx
  ON public.project_collaborators (user_id)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view project collaborators"
  ON public.project_collaborators FOR SELECT
  USING (true);

CREATE POLICY "Project owner can manage collaborators"
  ON public.project_collaborators FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND user_id = auth.uid()
    )
  );
