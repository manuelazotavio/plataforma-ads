// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { title, message, link_url, recipient_id } = await req.json() as {
      title?: string
      message?: string
      link_url?: string | null
      recipient_id?: string | null
    }

    if (!title?.trim() || !message?.trim()) {
      return json({ error: 'Título e mensagem são obrigatórios' }, 400)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Não autenticado' }, 401)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user: caller } } = await callerClient.auth.getUser()
    if (!caller) return json({ error: 'Não autenticado' }, 401)

    const { data: callerProfile } = await admin
      .from('users')
      .select('role, name')
      .eq('id', caller.id)
      .single()
    if (callerProfile?.role !== 'admin') return json({ error: 'Acesso negado' }, 403)

    const isGlobal = !recipient_id

    let recipientIds: string[]
    if (recipient_id) {
      recipientIds = [recipient_id]
    } else {
      const { data: allUsers } = await admin
        .from('users')
        .select('id')
        .neq('id', caller.id)
      recipientIds = (allUsers ?? []).map((u: { id: string }) => u.id)
    }

    if (recipientIds.length === 0) {
      return json({ sent: 0 }, 200)
    }

    const notifRows = recipientIds.map((userId) => ({
      user_id: userId,
      actor_id: caller.id,
      type: 'admin_announcement',
      target_type: 'announcement',
      target_id: null,
      target_title: title.trim(),
      message: message.trim(),
      link_url: link_url?.trim() || null,
    }))

    await admin.from('notifications').insert(notifRows)

    await admin.from('admin_announcements').insert({
      admin_id: caller.id,
      title: title.trim(),
      message: message.trim(),
      link_url: link_url?.trim() || null,
      recipient_type: isGlobal ? 'all' : 'user',
      recipient_id: recipient_id ?? null,
      recipient_count: recipientIds.length,
    })

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('NOTIFICATION_FROM_EMAIL') ?? Deno.env.get('JOB_NOTIFICATION_FROM_EMAIL')
    const siteUrl = (Deno.env.get('PUBLIC_SITE_URL') ?? Deno.env.get('SITE_URL') ?? '').replace(/\/$/, '')

    if (resendApiKey && fromEmail) {
      const emailEntries: { to: string }[] = []

      for (const uid of recipientIds) {
        const { data: { user: authUser } } = await admin.auth.admin.getUserById(uid)
        if (authUser?.email) {
          emailEntries.push({ to: authUser.email })
        }
      }

      if (emailEntries.length > 0) {
        const BATCH_SIZE = 100
        for (let i = 0; i < emailEntries.length; i += BATCH_SIZE) {
          const batch = emailEntries.slice(i, i + BATCH_SIZE).map(({ to }) => ({
            from: fromEmail,
            to,
            subject: title.trim(),
            html: buildEmail(title.trim(), message.trim(), link_url?.trim() || null, siteUrl),
          }))

          await fetch('https://api.resend.com/emails/batch', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(batch),
          })
        }
      }
    }

    return json({ sent: recipientIds.length }, 200)
  } catch (e) {
    console.error('send-admin-notification error', e)
    return json({ error: String(e) }, 500)
  }
})

function buildEmail(title: string, message: string, linkUrl: string | null, siteUrl: string): string {
  const logoUrl = siteUrl ? `${siteUrl}/logo-claro.png` : ''
  const ctaUrl = linkUrl || siteUrl || null

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${escapeHtml(title)}</title>
      </head>
      <body style="margin:0; padding:0; background-color:#f4f4f5;">
        <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${escapeHtml(title)}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
          <tr>
            <td align="center" style="padding:32px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
                <tr>
                  <td style="padding:0 4px 16px;">
                    ${logoUrl
                      ? `<img src="${escapeHtml(logoUrl)}" width="160" alt="ADS Conecta" style="display:block;width:160px;max-width:100%;height:auto;border:0;">`
                      : `<p style="margin:0;font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#18181b;">ADS Conecta</p>`}
                  </td>
                </tr>
                <tr>
                  <td style="overflow:hidden;border:1px solid #e4e4e7;border-radius:16px;background-color:#ffffff;">
                    <div style="padding:30px 32px 32px;">
                      <p style="margin:0 0 10px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#2F9E41;text-transform:uppercase;letter-spacing:.05em;">
                        Comunicado
                      </p>
                      <h1 style="margin:0 0 14px;font-family:Arial,sans-serif;font-size:24px;line-height:1.25;color:#18181b;">
                        ${escapeHtml(title)}
                      </h1>
                      <p style="margin:0;font-family:Arial,sans-serif;font-size:16px;line-height:1.65;color:#52525b;white-space:pre-line;">
                        ${escapeHtml(message)}
                      </p>
                      ${ctaUrl ? `
                        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:26px;">
                          <tr>
                            <td style="border-radius:10px;background-color:#2F9E41;">
                              <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:12px 20px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">
                                Ver no ADS Conecta
                              </a>
                            </td>
                          </tr>
                        </table>
                      ` : ''}
                    </div>
                    <div style="border-top:1px solid #f1f1f2;background-color:#fafafa;padding:17px 32px;">
                      <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:1.5;color:#71717a;">
                        Esta é uma notificação administrativa da plataforma ADS Conecta.
                      </p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:18px 16px 0;font-family:Arial,sans-serif;font-size:11px;color:#a1a1aa;">
                    ADS Conecta
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
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
