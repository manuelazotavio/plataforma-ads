// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Payload enviado pelo Database Webhook do Supabase
type WebhookPayload = {
  type: 'INSERT'
  table: string
  record: NotificationRecord
  schema: string
}

type NotificationRecord = {
  id: string
  user_id: string
  actor_id: string | null
  type: 'comment' | 'reply' | 'reaction' | 'comment_reaction' | 'event_reminder'
  target_type: 'article' | 'project' | 'forum_topic' | 'event'
  target_id: string
  target_title: string | null
}

const TARGET_LABELS: Record<string, string> = {
  article: 'artigo',
  project: 'projeto',
  forum_topic: 'tópico',
  event: 'evento',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('NOTIFICATION_FROM_EMAIL') ?? Deno.env.get('JOB_NOTIFICATION_FROM_EMAIL')
  const siteUrl = (Deno.env.get('PUBLIC_SITE_URL') ?? Deno.env.get('SITE_URL') ?? '').replace(/\/$/, '')

  if (!resendApiKey || !fromEmail) {
    return json({ error: 'Configure RESEND_API_KEY e NOTIFICATION_FROM_EMAIL.' }, 500)
  }

  try {
    const payload: WebhookPayload = await req.json()
    const notification = payload.record

    // Lembretes de evento têm email próprio via send-event-reminders
    if (notification.type === 'event_reminder') {
      return json({ skipped: 'event_reminder handled separately' }, 200)
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Buscar email do destinatário
    const { data: { user: recipient } } = await admin.auth.admin.getUserById(notification.user_id)
    if (!recipient?.email) return json({ skipped: 'no email' }, 200)

    // Buscar nome do ator (quem gerou a notificação)
    let actorName = 'Alguém'
    if (notification.actor_id) {
      const { data: actorProfile } = await admin
        .from('users')
        .select('name')
        .eq('id', notification.actor_id)
        .single()
      if (actorProfile?.name) actorName = actorProfile.name
    }

    const { subject, body } = buildEmail(notification, actorName, siteUrl)

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: recipient.email,
        subject,
        html: body,
      }),
    })

    return json({ sent: true }, 200)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

function buildEmail(
  n: NotificationRecord,
  actorName: string,
  siteUrl: string
): { subject: string; body: string } {
  const targetLabel = TARGET_LABELS[n.target_type] ?? 'conteúdo'
  const title = n.target_title ? `"${n.target_title}"` : `seu ${targetLabel}`
  const targetUrl = buildTargetUrl(siteUrl, n.target_type, n.target_id)

  let subject = ''
  let headline = ''
  let detail = ''

  switch (n.type) {
    case 'comment':
      subject = `${actorName} comentou no seu ${targetLabel}`
      headline = `Novo comentário`
      detail = `<strong>${escapeHtml(actorName)}</strong> comentou no seu ${targetLabel} ${escapeHtml(title)}.`
      break
    case 'reply':
      subject = `${actorName} respondeu seu comentário`
      headline = `Nova resposta`
      detail = `<strong>${escapeHtml(actorName)}</strong> respondeu seu comentário em ${escapeHtml(title)}.`
      break
    case 'reaction':
      subject = `${actorName} curtiu seu ${targetLabel}`
      headline = `Nova curtida`
      detail = `<strong>${escapeHtml(actorName)}</strong> curtiu seu ${targetLabel} ${escapeHtml(title)}.`
      break
    case 'comment_reaction':
      subject = `${actorName} curtiu seu comentário`
      headline = `Nova curtida`
      detail = `<strong>${escapeHtml(actorName)}</strong> curtiu seu comentário em ${escapeHtml(title)}.`
      break
  }

  return {
    subject,
    body: `
      <div style="font-family: Arial, sans-serif; color: #18181b; line-height: 1.6; max-width: 480px;">
        <p style="font-size: 13px; font-weight: 700; color: #2F9E41; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em;">${escapeHtml(headline)}</p>
        <p style="font-size: 16px; margin: 0 0 20px;">${detail}</p>
        ${targetUrl ? `<p style="margin: 0;"><a href="${targetUrl}" style="display: inline-block; background: #2F9E41; color: white; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px;">Ver no ADS Conecta</a></p>` : ''}
        <p style="font-size: 12px; color: #71717a; margin-top: 28px; border-top: 1px solid #e4e4e7; padding-top: 16px;">
          Você recebeu este e-mail porque tem uma conta no ADS Conecta.
        </p>
      </div>
    `,
  }
}

function buildTargetUrl(siteUrl: string, targetType: string, targetId: string): string {
  if (!siteUrl) return ''
  switch (targetType) {
    case 'article': return `${siteUrl}/artigos/${targetId}`
    case 'project': return `${siteUrl}/projetos/${targetId}`
    case 'forum_topic': return `${siteUrl}/forum/${targetId}`
    case 'event': return `${siteUrl}/eventos`
    default: return siteUrl
  }
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
