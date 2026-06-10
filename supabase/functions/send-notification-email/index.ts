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
  type: 'comment' | 'reply' | 'reaction' | 'comment_reaction' | 'mention' | 'event_reminder' | 'review_request' | 'content_approved' | 'content_rejected'
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

    // Estes tipos têm fluxos de e-mail próprios.
    if (['event_reminder', 'review_request', 'content_approved', 'content_rejected'].includes(notification.type)) {
      return json({ skipped: 'handled separately' }, 200)
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
  const title = n.target_title ? `“${n.target_title}”` : `seu ${targetLabel}`
  const targetUrl = buildTargetUrl(siteUrl, n.target_type, n.target_id)

  let subject = ''
  let headline = ''
  let detail = ''

  switch (n.type) {
    case 'comment':
      subject = `${actorName} comentou no seu ${targetLabel}`
      headline = `Novo comentário`
      detail = `<strong style="color:#18181b;">${escapeHtml(actorName)}</strong> comentou no seu ${targetLabel} ${escapeHtml(title)}`
      break
    case 'reply':
      subject = `${actorName} respondeu seu comentário`
      headline = `Nova resposta`
      detail = `<strong style="color:#18181b;">${escapeHtml(actorName)}</strong> respondeu seu comentário em ${escapeHtml(title)}`
      break
    case 'reaction':
      subject = `${actorName} curtiu seu ${targetLabel}`
      headline = `Nova curtida`
      detail = `<strong style="color:#18181b;">${escapeHtml(actorName)}</strong> curtiu seu ${targetLabel} ${escapeHtml(title)}`
      break
    case 'comment_reaction':
      subject = `${actorName} curtiu seu comentário`
      headline = `Nova curtida`
      detail = `<strong style="color:#18181b;">${escapeHtml(actorName)}</strong> curtiu seu comentário em ${escapeHtml(title)}`
      break
    case 'mention':
      subject = `${actorName} mencionou você`
      headline = `Nova menção`
      detail = `<strong style="color:#18181b;">${escapeHtml(actorName)}</strong> mencionou você no ${targetLabel} ${escapeHtml(title)}`
      break
  }

  return {
    subject,
    body: `
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>${escapeHtml(subject)}</title>
        </head>
        <body style="margin:0; padding:0; background-color:#f4f4f5;">
          <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
            ${escapeHtml(subject)}
          </div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
            <tr>
              <td align="center" style="padding:32px 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
                  <tr>
                    <td style="padding:0 4px 16px;">
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="width:36px; height:36px; border-radius:10px; background-color:#2F9E41; color:#ffffff; font-family:Arial,sans-serif; font-size:16px; font-weight:700; text-align:center; vertical-align:middle;">
                            ADS
                          </td>
                          <td style="padding-left:10px; font-family:Arial,sans-serif; font-size:15px; font-weight:700; color:#18181b;">
                            ADS Conecta
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="overflow:hidden; border:1px solid #e4e4e7; border-radius:16px; background-color:#ffffff;">
                      <div style="height:5px; background-color:#2F9E41;"></div>
                      <div style="padding:30px 32px 32px;">
                        <p style="margin:0 0 10px; font-family:Arial,sans-serif; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#2F9E41;">
                          ${escapeHtml(headline)}
                        </p>
                        <h1 style="margin:0 0 14px; font-family:Arial,sans-serif; font-size:24px; line-height:1.25; color:#18181b;">
                          Você tem uma nova interação
                        </h1>
                        <p style="margin:0; font-family:Arial,sans-serif; font-size:16px; line-height:1.65; color:#52525b;">
                          ${detail}
                        </p>
                        ${targetUrl ? `
                          <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:26px;">
                            <tr>
                              <td style="border-radius:10px; background-color:#2F9E41;">
                                <a href="${escapeHtml(targetUrl)}" style="display:inline-block; padding:12px 20px; font-family:Arial,sans-serif; font-size:14px; font-weight:700; color:#ffffff; text-decoration:none;">
                                  Ver no ADS Conecta&nbsp;&nbsp;→
                                </a>
                              </td>
                            </tr>
                          </table>
                        ` : ''}
                      </div>
                      <div style="border-top:1px solid #f1f1f2; background-color:#fafafa; padding:17px 32px;">
                        <p style="margin:0; font-family:Arial,sans-serif; font-size:12px; line-height:1.5; color:#71717a;">
                          Esta é uma notificação automática da sua conta no ADS Conecta.
                        </p>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:18px 16px 0; font-family:Arial,sans-serif; font-size:11px; color:#a1a1aa;">
                      ADS Conecta · Instituto Federal de São Paulo
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
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
