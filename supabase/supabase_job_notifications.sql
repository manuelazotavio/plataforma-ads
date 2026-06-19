CREATE TABLE IF NOT EXISTS public.job_notification_subscriptions (
  user_id    uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.job_notification_emails_sent (
  job_id      uuid PRIMARY KEY REFERENCES public.jobs(id) ON DELETE CASCADE,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  recipients  integer NOT NULL DEFAULT 0
);

ALTER TABLE public.job_notification_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_notification_emails_sent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own job notification subscription" ON public.job_notification_subscriptions;
CREATE POLICY "Users can view own job notification subscription"
  ON public.job_notification_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can subscribe to job notifications" ON public.job_notification_subscriptions;
CREATE POLICY "Users can subscribe to job notifications"
  ON public.job_notification_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unsubscribe from job notifications" ON public.job_notification_subscriptions;
CREATE POLICY "Users can unsubscribe from job notifications"
  ON public.job_notification_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view sent job notification emails" ON public.job_notification_emails_sent;
CREATE POLICY "Admins can view sent job notification emails"
  ON public.job_notification_emails_sent FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

