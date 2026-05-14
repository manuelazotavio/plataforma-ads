import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

type Job = {
  id: string
  position: string
  company: string
  location: string | null
  job_type: string | null
  work_mode: string | null
  application_url: string | null
  category: string | null
  is_active: boolean
}

type Subscriber = {
  users: { email: string | null; name: string | null } | { email: string | null; name: string | null }[] | null
}

const CATEGORY_LABELS: Record<string, string> = {
  estagio: 'Estágio',
  bolsa: 'Bolsa',
  evento_externo: 'Evento externo',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { job_id } = await req.json()
    if (!job_id) return json({ error: 'job_id é obrigatório' }, 400)

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Não autenticado' }, 401)

    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user: caller } } = await callerClient.auth.getUser()
    if (!caller) return json({ error: 'Não autenticado' }, 401)

    const { data: callerProfile } = await adminClient
      .from('users')
      .select('role')
      .eq('id', caller.id)
      .single()
    if (callerProfile?.role !== 'admin') return json({ error: 'Acesso negado' }, 403)

    const { data: alreadySent } = await adminClient
      .from('job_notification_emails_sent')
      .select('job_id')
      .eq('job_id', job_id)
      .maybeSingle()
    if (alreadySent) return json({ sent: 0, skipped: true }, 200)

    const { data: job } = await adminClient
      .from('jobs')
      .select('id, position, company, location, job_type, work_mode, application_url, category, is_active')
      .eq('id', job_id)
      .single()
    if (!job) return json({ error: 'Oportunidade não encontrada' }, 404)
    if (!job.is_active) return json({ error: 'Oportunidade ainda não está ativa' }, 400)

    const { data: subscriptions } = await adminClient
      .from('job_notification_subscriptions')
      .select('users(email, name)')

    const recipients = ((subscriptions ?? []) as Subscriber[])
      .map((subscription) => firstRelation(subscription.users))
      .filter((user): user is { email: string; name: string | null } => !!user?.email)

    if (recipients.length === 0) {
      await markSent(adminClient, job.id, 0)
      return json({ sent: 0 }, 200)
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('JOB_NOTIFICATION_FROM_EMAIL')
    const siteUrl = Deno.env.get('PUBLIC_SITE_URL') ?? Deno.env.get('SITE_URL') ?? ''

    if (!resendApiKey || !fromEmail) {
      return json({ error: 'Configure RESEND_API_KEY e JOB_NOTIFICATION_FROM_EMAIL na Edge Function.' }, 500)
    }

    const appUrl = siteUrl ? `${siteUrl.replace(/\/$/, '')}/vagas` : null
    const chunks = chunk(recipients, 50)
    let sent = 0

    for (const group of chunks) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          bcc: group.map((recipient) => recipient.email),
          subject: `Nova oportunidade: ${job.position}`,
          html: emailHtml(job as Job, appUrl),
        }),
      })

      if (!response.ok) {
        const message = await response.text()
        return json({ error: `Erro ao enviar e-mail: ${message}` }, 502)
      }

      sent += group.length
    }

    await markSent(adminClient, job.id, sent)
    return json({ sent }, 200)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

function emailHtml(job: Job, appUrl: string | null) {
  const category = job.category ? CATEGORY_LABELS[job.category] ?? job.category : 'Oportunidade'
  const details = [
    job.company,
    job.location,
    job.job_type,
    job.work_mode,
  ].filter(Boolean).join(' · ')
  const targetUrl = job.application_url || appUrl

  return `
    <div style="font-family: Arial, sans-serif; color: #18181b; line-height: 1.5;">
      <p style="font-size: 13px; font-weight: 700; color: #2F9E41; margin: 0 0 8px;">${escapeHtml(category)}</p>
      <h1 style="font-size: 22px; margin: 0 0 8px;">${escapeHtml(job.position)}</h1>
      <p style="font-size: 15px; color: #52525b; margin: 0 0 20px;">${escapeHtml(details)}</p>
      ${targetUrl ? `<a href="${escapeHtml(targetUrl)}" style="display: inline-block; background: #2F9E41; color: white; padding: 10px 16px; border-radius: 8px; text-decoration: none; font-weight: 700;">Ver oportunidade</a>` : ''}
      <p style="font-size: 12px; color: #71717a; margin-top: 24px;">
        Você recebeu este e-mail porque ativou notificações de novas oportunidades no ADS Comunica.
      </p>
    </div>
  `
}

function firstRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function markSent(adminClient: ReturnType<typeof createClient>, jobId: string, recipients: number) {
  await adminClient
    .from('job_notification_emails_sent')
    .insert({ job_id: jobId, recipients })
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

