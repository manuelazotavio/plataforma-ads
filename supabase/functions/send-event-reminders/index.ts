// @ts-nocheck
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

type EventRow = { id: string; title: string; start_date: string | null }
type ReminderRow = { id: string; user_id: string; event_id: string }
type EmailConfig = { resendApiKey: string; fromEmail: string; siteUrl: string }

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret) {
    const provided =
      req.headers.get('x-cron-secret') ?? new URL(req.url).searchParams.get('secret')
    if (provided !== cronSecret) return json({ error: 'Não autorizado' }, 401)
  }

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('NOTIFICATION_FROM_EMAIL') ?? Deno.env.get('JOB_NOTIFICATION_FROM_EMAIL')
    const siteUrl = (Deno.env.get('PUBLIC_SITE_URL') ?? Deno.env.get('SITE_URL') ?? '').replace(/\/$/, '')
    const emailConfig: EmailConfig | null = resendApiKey && fromEmail
      ? { resendApiKey, fromEmail, siteUrl }
      : null

    const today = new Date()
    const addDays = (n: number) => {
      const d = new Date(today)
      d.setUTCDate(d.getUTCDate() + n)
      return d.toISOString().slice(0, 10)
    }

    const oneDay = await processWindow(admin, 'notified_1d', addDays(0), addDays(1), 1, emailConfig)
    const threeDay = await processWindow(admin, 'notified_3d', addDays(2), addDays(3), 3, emailConfig)

    return json({ created: oneDay + threeDay, one_day: oneDay, three_day: threeDay }, 200)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

async function processWindow(
  admin: SupabaseClient,
  flag: 'notified_1d' | 'notified_3d',
  fromDate: string,
  toDate: string,
  daysAhead: number,
  emailConfig: EmailConfig | null
): Promise<number> {
  const { data: events } = await admin
    .from('events')
    .select('id, title, start_date')
    .gte('start_date', fromDate)
    .lte('start_date', toDate)

  const eventList = (events ?? []) as EventRow[]
  if (eventList.length === 0) return 0

  const eventTitle = new Map(eventList.map((e) => [e.id, e.title]))
  const eventDate = new Map(eventList.map((e) => [e.id, e.start_date]))

  const { data: reminders } = await admin
    .from('event_reminders')
    .select('id, user_id, event_id')
    .in('event_id', eventList.map((e) => e.id))
    .eq(flag, false)

  const reminderList = (reminders ?? []) as ReminderRow[]
  if (reminderList.length === 0) return 0

  // Create in-app notifications
  await admin.from('notifications').insert(
    reminderList.map((r) => ({
      user_id: r.user_id,
      type: 'event_reminder',
      target_type: 'event',
      target_id: r.event_id,
      target_title: eventTitle.get(r.event_id) ?? null,
    }))
  )

  // Mark flags
  await admin
    .from('event_reminders')
    .update({ [flag]: true })
    .in('id', reminderList.map((r) => r.id))

  // Send emails
  if (emailConfig) {
    const userIds = [...new Set(reminderList.map((r) => r.user_id))]
    const { data: authUsers } = await admin.auth.admin.listUsers()
    const emailByUserId = new Map<string, string>()
    for (const u of authUsers?.users ?? []) {
      if (u.email && userIds.includes(u.id)) emailByUserId.set(u.id, u.email)
    }

    for (const reminder of reminderList) {
      const toEmail = emailByUserId.get(reminder.user_id)
      if (!toEmail) continue
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${emailConfig.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: emailConfig.fromEmail,
          to: toEmail,
          subject: `Lembrete: ${eventTitle.get(reminder.event_id) ?? 'Evento'}`,
          html: eventReminderHtml(
            eventTitle.get(reminder.event_id) ?? 'Evento',
            eventDate.get(reminder.event_id) ?? null,
            daysAhead,
            emailConfig.siteUrl
          ),
        }),
      })
    }
  }

  return reminderList.length
}

function eventReminderHtml(title: string, startDate: string | null, daysAhead: number, siteUrl: string): string {
  const dateLabel = startDate
    ? new Date(startDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    : null
  const when = daysAhead === 1 ? 'amanhã' : `em ${daysAhead} dias`

  return `
    <div style="font-family: Arial, sans-serif; color: #18181b; line-height: 1.6; max-width: 480px;">
      <p style="font-size: 13px; font-weight: 700; color: #2F9E41; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em;">Lembrete de evento</p>
      <h1 style="font-size: 22px; margin: 0 0 8px; font-weight: 800;">${escapeHtml(title)}</h1>
      <p style="font-size: 15px; color: #52525b; margin: 0 0 4px;">O evento acontece <strong>${when}</strong>${dateLabel ? `, ${dateLabel}` : ''}.</p>
      ${siteUrl ? `<p style="margin: 20px 0 0;"><a href="${siteUrl}/eventos" style="display: inline-block; background: #2F9E41; color: white; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px;">Ver evento</a></p>` : ''}
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
