create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

do $$
declare
  existing_job_id bigint;
begin
  select jobid
    into existing_job_id
  from cron.job
  where jobname = 'send-event-reminders-daily';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'send-event-reminders-daily',
    '0 12 * * *',
    $job$
      select net.http_post(
        url := (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'event_reminder_project_url'
        ) || '/functions/v1/send-event-reminders',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'event_reminder_anon_key'
          ),
          'x-cron-secret', (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'event_reminder_cron_secret'
          )
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 30000
      );
    $job$
  );
end
$$;
