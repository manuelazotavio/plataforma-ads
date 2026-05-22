import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'


type EventRow = { id: string; title: string; start_date: string | null }
type ReminderRow = { id: string; user_id: string; event_id: string }

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

    const today = new Date()
    const addDays = (n: number) => {
      const d = new Date(today)
      d.setUTCDate(d.getUTCDate() + n)
      return d.toISOString().slice(0, 10)
    }

    const oneDay = await processWindow(admin, 'notified_1d', addDays(0), addDays(1))
    const threeDay = await processWindow(admin, 'notified_3d', addDays(2), addDays(3))

    return json({ created: oneDay + threeDay, one_day: oneDay, three_day: threeDay }, 200)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

async function processWindow(
  admin: SupabaseClient,
  flag: 'notified_1d' | 'notified_3d',
  fromDate: string,
  toDate: string
): Promise<number> {
  const { data: events } = await admin
    .from('events')
    .select('id, title, start_date')
    .gte('start_date', fromDate)
    .lte('start_date', toDate)

  const eventList = (events ?? []) as EventRow[]
  if (eventList.length === 0) return 0

  const eventTitle = new Map(eventList.map((e) => [e.id, e.title]))

  const { data: reminders } = await admin
    .from('event_reminders')
    .select('id, user_id, event_id')
    .in('event_id', eventList.map((e) => e.id))
    .eq(flag, false)

  const reminderList = (reminders ?? []) as ReminderRow[]
  if (reminderList.length === 0) return 0

  await admin.from('notifications').insert(
    reminderList.map((r) => ({
      user_id: r.user_id,
      type: 'event_reminder',
      target_type: 'event',
      target_id: r.event_id,
      target_title: eventTitle.get(r.event_id) ?? null,
    }))
  )

  await admin
    .from('event_reminders')
    .update({ [flag]: true })
    .in('id', reminderList.map((r) => r.id))

  return reminderList.length
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
