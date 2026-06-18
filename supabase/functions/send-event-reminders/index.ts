// @ts-nocheck
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

type EventRow = { id: string; title: string; start_date: string }
type ReminderRow = { id: string; user_id: string; event_id: string }
type EmailConfig = { resendApiKey: string; fromEmail: string; siteUrl: string }
type WindowResult = { processed: number; emailsSent: number; emailFailures: number }

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const cronSecret = Deno.env.get('CRON_SECRET')
  const providedSecret =
    req.headers.get('x-cron-secret') ?? new URL(req.url).searchParams.get('secret')

  if (!cronSecret || providedSecret !== cronSecret) {
    return json({ error: 'Não autorizado' }, 401)
  }

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail =
      Deno.env.get('NOTIFICATION_FROM_EMAIL') ?? Deno.env.get('JOB_NOTIFICATION_FROM_EMAIL')
    const siteUrl = (Deno.env.get('PUBLIC_SITE_URL') ?? Deno.env.get('SITE_URL') ?? '')
      .replace(/\/$/, '')
    const emailConfig: EmailConfig | null = resendApiKey && fromEmail
      ? { resendApiKey, fromEmail, siteUrl }
      : null

    const today = new Date()
    const dateInDays = (days: number) => {
      const date = new Date(today)
      date.setUTCDate(date.getUTCDate() + days)
      return date.toISOString().slice(0, 10)
    }

    const oneDay = await processWindow(admin, 'notified_1d', dateInDays(1), 1, emailConfig)
    const threeDay = await processWindow(admin, 'notified_3d', dateInDays(3), 3, emailConfig)

    return json({
      processed: oneDay.processed + threeDay.processed,
      one_day: oneDay.processed,
      three_day: threeDay.processed,
      emails_sent: oneDay.emailsSent + threeDay.emailsSent,
      email_failures: oneDay.emailFailures + threeDay.emailFailures,
    }, 200)
  } catch (error) {
    console.error('Unexpected event reminder error', error)
    return json({ error: String(error) }, 500)
  }
})

async function processWindow(
  admin: SupabaseClient,
  flag: 'notified_1d' | 'notified_3d',
  targetDate: string,
  daysAhead: number,
  emailConfig: EmailConfig | null
): Promise<WindowResult> {
  const { data: events, error: eventsError } = await admin
    .from('events')
    .select('id, title, start_date')
    .eq('start_date', targetDate)
  if (eventsError) throw eventsError

  const eventList = (events ?? []) as EventRow[]
  if (eventList.length === 0) return { processed: 0, emailsSent: 0, emailFailures: 0 }

  const eventById = new Map(eventList.map((event) => [event.id, event]))
  const { data: reminders, error: remindersError } = await admin
    .from('event_reminders')
    .select('id, user_id, event_id')
    .in('event_id', eventList.map((event) => event.id))
    .eq(flag, false)
  if (remindersError) throw remindersError

  const reminderList = (reminders ?? []) as ReminderRow[]
  if (reminderList.length === 0) return { processed: 0, emailsSent: 0, emailFailures: 0 }

  const { error: notificationError } = await admin.from('notifications').insert(
    reminderList.map((reminder) => ({
      user_id: reminder.user_id,
      type: 'event_reminder',
      target_type: 'event',
      target_id: reminder.event_id,
      target_title: eventById.get(reminder.event_id)?.title ?? null,
    }))
  )
  if (notificationError) throw notificationError

  const { error: updateError } = await admin
    .from('event_reminders')
    .update({ [flag]: true })
    .in('id', reminderList.map((reminder) => reminder.id))
  if (updateError) throw updateError

  if (!emailConfig) {
    console.warn('Event reminder emails skipped because email secrets are missing')
    return { processed: reminderList.length, emailsSent: 0, emailFailures: 0 }
  }

  let emailsSent = 0
  let emailFailures = 0
  const emailByUserId = new Map<string, string | null>()

  for (const reminder of reminderList) {
    if (!emailByUserId.has(reminder.user_id)) {
      const { data, error } = await admin.auth.admin.getUserById(reminder.user_id)
      if (error) {
        console.error('Could not load reminder recipient', { userId: reminder.user_id, error })
      }
      emailByUserId.set(reminder.user_id, data?.user?.email ?? null)
    }

    const toEmail = emailByUserId.get(reminder.user_id)
    if (!toEmail) continue

    const event = eventById.get(reminder.event_id)
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${emailConfig.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailConfig.fromEmail,
        to: toEmail,
        subject: `Lembrete: ${event?.title ?? 'Evento'}`,
        html: eventReminderHtml(
          event?.title ?? 'Evento',
          event?.start_date ?? null,
          daysAhead,
          emailConfig.siteUrl,
          reminder.event_id
        ),
      }),
    })

    if (response.ok) {
      emailsSent += 1
    } else {
      emailFailures += 1
      console.error('Resend rejected event reminder email', {
        reminderId: reminder.id,
        status: response.status,
        message: await response.text(),
      })
    }
  }

  return { processed: reminderList.length, emailsSent, emailFailures }
}

function eventReminderHtml(
  title: string,
  startDate: string | null,
  daysAhead: number,
  siteUrl: string,
  eventId: string
): string {
  const dateLabel = startDate
    ? new Date(`${startDate}T12:00:00`).toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : null
  const when = daysAhead === 1 ? 'amanhã' : `em ${daysAhead} dias`
  const eventUrl = siteUrl ? `${siteUrl}/eventos/${eventId}` : null

  return `
    <div style="font-family: Arial, sans-serif; color: #18181b; line-height: 1.6; max-width: 480px;">
      <p style="font-size: 13px; font-weight: 700; color: #2F9E41; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em;">Lembrete de evento</p>
      <h1 style="font-size: 22px; margin: 0 0 8px; font-weight: 800;">${escapeHtml(title)}</h1>
      <p style="font-size: 15px; color: #52525b; margin: 0 0 4px;">O evento acontece <strong>${when}</strong>${dateLabel ? `, ${dateLabel}` : ''}.</p>
      ${eventUrl ? `<p style="margin: 20px 0 0;"><a href="${escapeHtml(eventUrl)}" style="display: inline-block; background: #2F9E41; color: white; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px;">Ver evento</a></p>` : ''}
      <p style="font-size: 12px; color: #71717a; margin-top: 28px; border-top: 1px solid #e4e4e7; padding-top: 16px;">
        Você ativou um lembrete para este evento no ADS Conecta. Para gerenciar seus lembretes, acesse seu perfil.
      </p>
    </div>
  `
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
