
ALTER TABLE public.professors
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS professors_user_id_idx ON public.professors (user_id);

CREATE POLICY "Professor can update own record"
  ON public.professors FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
