CREATE TABLE IF NOT EXISTS public.nps_responses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  score      integer NOT NULL CHECK (score BETWEEN 0 AND 10),
  comment    text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nps_insert_own" ON public.nps_responses;
CREATE POLICY "nps_insert_own" ON public.nps_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "nps_select_own_or_admin" ON public.nps_responses;
CREATE POLICY "nps_select_own_or_admin" ON public.nps_responses
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "nps_update_own" ON public.nps_responses;
CREATE POLICY "nps_update_own" ON public.nps_responses
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "nps_delete_admin" ON public.nps_responses;
CREATE POLICY "nps_delete_admin" ON public.nps_responses
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
