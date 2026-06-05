
ALTER TABLE public.forum_topic_votes ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.forum_reply_votes  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();


CREATE TABLE IF NOT EXISTS public.missions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text,
  type        text NOT NULL CHECK (type IN (
    'forum_votes', 'comments', 'forum_replies',
    'topics_created', 'projects_created', 'articles_created'
  )),
  target_count integer NOT NULL DEFAULT 1,
  xp_reward   integer NOT NULL DEFAULT 50,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS public.weekly_mission_sets (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL UNIQUE, 
  bonus_xp  integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS public.weekly_set_missions (
  set_id     uuid NOT NULL REFERENCES public.weekly_mission_sets(id) ON DELETE CASCADE,
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  PRIMARY KEY (set_id, mission_id)
);


CREATE TABLE IF NOT EXISTS public.mission_completions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type         text NOT NULL CHECK (type IN ('mission', 'weekly_bonus')),
  mission_id   uuid REFERENCES public.missions(id) ON DELETE SET NULL,
  set_id       uuid REFERENCES public.weekly_mission_sets(id) ON DELETE SET NULL,
  xp           integer NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, type, mission_id, set_id)
);

CREATE INDEX IF NOT EXISTS mission_completions_user_idx ON public.mission_completions (user_id);


ALTER TABLE public.missions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_mission_sets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_set_missions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_completions   ENABLE ROW LEVEL SECURITY;


CREATE POLICY "missions_read"  ON public.missions FOR SELECT USING (true);
CREATE POLICY "missions_admin" ON public.missions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));


CREATE POLICY "wms_read"  ON public.weekly_mission_sets FOR SELECT USING (true);
CREATE POLICY "wms_admin" ON public.weekly_mission_sets FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));


CREATE POLICY "wsm_read"  ON public.weekly_set_missions FOR SELECT USING (true);
CREATE POLICY "wsm_admin" ON public.weekly_set_missions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));


CREATE POLICY "mc_read_own"   ON public.mission_completions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "mc_insert_own" ON public.mission_completions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mc_admin"      ON public.mission_completions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
