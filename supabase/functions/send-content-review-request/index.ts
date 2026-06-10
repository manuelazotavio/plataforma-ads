import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

type ContentType = 'project' | 'article'

type ReviewContent = {
  id: string
  title: string
  user_id: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { content_type, content_id } = await req.json() as {
      content_type?: ContentType
      content_id?: string
    }
    if (!content_id || !['project', 'article'].includes(content_type ?? '')) {
      return json({ error: 'content_type e content_id são obrigatórios' }, 400)
    }

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

    const content = await loadContent(adminClient, content_type as ContentType, content_id)
    if (!content) return json({ error: 'Conteúdo não encontrado ou não está aguardando revisão' }, 404)
    if (content.user_id !== caller.id) return json({ error: 'Acesso negado' }, 403)

    const { data: authorProfile } = await adminClient
      .from('users')
      .select('name')
      .eq('id', caller.id)
      .single()

    const { data: adminProfiles } = await adminClient
      .from('users')
      .select('id')
      .eq('role', 'admin')

    const adminEmails = await Promise.all(
      (adminProfiles ?? []).map(async (profile) => {
        const { data: { user } } = await adminClient.auth.admin.getUserById(profile.id)
        return user?.email ?? null
      })
    )
    const recipients = [...new Set(adminEmails.filter((email): email is string => Boolean(email)))]
    if (recipients.length === 0) return json({ skipped: 'Nenhum administrador com e-mail cadastrado' }, 200)

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('NOTIFICATION_FROM_EMAIL') ?? Deno.env.get('JOB_NOTIFICATION_FROM_EMAIL')
    const siteUrl = (Deno.env.get('PUBLIC_SITE_URL') ?? Deno.env.get('SITE_URL') ?? '').replace(/\/$/, '')
    if (!resendApiKey || !fromEmail) {
      return json({ error: 'Configure RESEND_API_KEY e NOTIFICATION_FROM_EMAIL.' }, 500)
    }

    const adminUrl = siteUrl
      ? `${siteUrl}/admin/${content_type === 'project' ? 'projetos' : 'artigos'}`
      : null
    const label = content_type === 'project' ? 'projeto' : 'artigo'
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        bcc: recipients,
        subject: `Novo ${label} aguardando aprovação: ${content.title}`,
        html: emailHtml(label, content, authorProfile?.name ?? 'Um autor', adminUrl),
      }),
    })

    if (!response.ok) {
      const message = await response.text()
      console.error('Resend rejected content review request email', {
        contentType: content_type,
        contentId: content.id,
        status: response.status,
        message,
      })
      return json({ error: `Erro ao enviar e-mail: ${message}` }, 502)
    }

    return json({ sent: recipients.length }, 200)
  } catch (error) {
    console.error('Unexpected content review request email error', error)
    return json({ error: String(error) }, 500)
  }
})

async function loadContent(
  adminClient: ReturnType<typeof createClient>,
  contentType: ContentType,
  contentId: string
): Promise<ReviewContent | null> {
  if (contentType === 'project') {
    const { data } = await adminClient
      .from('projects')
      .select('id, title, user_id')
      .eq('id', contentId)
      .eq('approved', false)
      .is('rejection_message', null)
      .maybeSingle()
    return data as ReviewContent | null
  }

  const { data } = await adminClient
    .from('articles')
    .select('id, title, user_id')
    .eq('id', contentId)
    .eq('status', 'pendente')
    .maybeSingle()
  return data as ReviewContent | null
}

function emailHtml(label: string, content: ReviewContent, authorName: string, adminUrl: string | null) {
  return `
    <div style="font-family: Arial, sans-serif; color: #18181b; line-height: 1.6; max-width: 520px;">
      <p style="font-size: 13px; font-weight: 700; color: #2F9E41; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em;">
        Nova solicitação de aprovação
      </p>
      <h1 style="font-size: 22px; margin: 0 0 12px;">${escapeHtml(content.title)}</h1>
      <p style="font-size: 15px; margin: 0 0 20px;">
        <strong>${escapeHtml(authorName)}</strong> enviou um ${escapeHtml(label)} para revisão.
      </p>
      ${adminUrl ? `<a href="${escapeHtml(adminUrl)}" style="display: inline-block; background: #2F9E41; color: white; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px;">Revisar ${escapeHtml(label)}</a>` : ''}
      <p style="font-size: 12px; color: #71717a; margin-top: 28px; border-top: 1px solid #e4e4e7; padding-top: 16px;">
        Você recebeu este e-mail porque possui acesso administrativo no ADS Conecta.
      </p>
    </div>
  `
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
