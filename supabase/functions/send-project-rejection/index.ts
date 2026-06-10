import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

type Project = {
  id: string
  title: string
  approved: boolean
  rejection_message: string | null
  user_id: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { project_id } = await req.json()
    if (!project_id) return json({ error: 'project_id é obrigatório' }, 400)

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

    const { data: project } = await adminClient
      .from('projects')
      .select('id, title, approved, rejection_message, user_id')
      .eq('id', project_id)
      .single()
    if (!project) return json({ error: 'Projeto não encontrado' }, 404)

    const reviewedProject = project as Project
    if (!reviewedProject.approved && !reviewedProject.rejection_message) {
      return json({ error: 'O projeto não possui motivo de reprovação' }, 400)
    }

    const { data: { user: recipient } } = await adminClient.auth.admin.getUserById(reviewedProject.user_id)
    if (!recipient?.email) return json({ skipped: 'Autor sem e-mail cadastrado' }, 200)

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('NOTIFICATION_FROM_EMAIL') ?? Deno.env.get('JOB_NOTIFICATION_FROM_EMAIL')
    const siteUrl = (Deno.env.get('PUBLIC_SITE_URL') ?? Deno.env.get('SITE_URL') ?? '').replace(/\/$/, '')

    if (!resendApiKey || !fromEmail) {
      return json({ error: 'Configure RESEND_API_KEY e NOTIFICATION_FROM_EMAIL.' }, 500)
    }

    const targetUrl = siteUrl
      ? reviewedProject.approved
        ? `${siteUrl}/projetos/${reviewedProject.id}`
        : `${siteUrl}/projetos/${reviewedProject.id}/editar`
      : null
    const decision = reviewedProject.approved ? 'approved' : 'rejected'
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: recipient.email,
        subject: reviewedProject.approved
          ? `Seu projeto foi aprovado: ${reviewedProject.title}`
          : `Seu projeto precisa de ajustes: ${reviewedProject.title}`,
        html: emailHtml(reviewedProject, targetUrl),
      }),
    })

    if (!response.ok) {
      const message = await response.text()
      console.error('Resend rejected project review email', {
        projectId: reviewedProject.id,
        decision,
        status: response.status,
        message,
      })
      return json({ error: `Erro ao enviar e-mail: ${message}` }, 502)
    }

    return json({ sent: true, decision }, 200)
  } catch (error) {
    console.error('Unexpected project review email error', error)
    return json({ error: String(error) }, 500)
  }
})

function emailHtml(project: Project, targetUrl: string | null) {
  if (project.approved) {
    return `
      <div style="font-family: Arial, sans-serif; color: #18181b; line-height: 1.6; max-width: 520px;">
        <p style="font-size: 13px; font-weight: 700; color: #2F9E41; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em;">
          Projeto aprovado
        </p>
        <h1 style="font-size: 22px; margin: 0 0 16px;">${escapeHtml(project.title)}</h1>
        <p style="font-size: 15px; margin: 0 0 20px;">
          Seu projeto foi revisado e aprovado. Ele já está disponível na área pública do ADS Conecta.
        </p>
        ${targetUrl ? `<a href="${escapeHtml(targetUrl)}" style="display: inline-block; background: #2F9E41; color: white; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px;">Ver projeto</a>` : ''}
        <p style="font-size: 12px; color: #71717a; margin-top: 28px; border-top: 1px solid #e4e4e7; padding-top: 16px;">
          Você recebeu este e-mail porque publicou um projeto no ADS Conecta.
        </p>
      </div>
    `
  }

  return `
    <div style="font-family: Arial, sans-serif; color: #18181b; line-height: 1.6; max-width: 520px;">
      <p style="font-size: 13px; font-weight: 700; color: #dc2626; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em;">
        Projeto precisa de ajustes
      </p>
      <h1 style="font-size: 22px; margin: 0 0 16px;">${escapeHtml(project.title)}</h1>
      <p style="font-size: 15px; margin: 0 0 8px;">A equipe responsável revisou seu projeto e deixou a seguinte orientação:</p>
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #991b1b; margin: 0 0 20px; padding: 12px 14px;">
        ${escapeHtml(project.rejection_message ?? '')}
      </div>
      ${targetUrl ? `<a href="${escapeHtml(targetUrl)}" style="display: inline-block; background: #2F9E41; color: white; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px;">Editar projeto</a>` : ''}
      <p style="font-size: 12px; color: #71717a; margin-top: 28px; border-top: 1px solid #e4e4e7; padding-top: 16px;">
        Após realizar os ajustes, envie o projeto novamente para avaliação no ADS Conecta.
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
