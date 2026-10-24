import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

type Game = {
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
    const { game_id } = await req.json()
    if (!game_id) return json({ error: 'game_id é obrigatório' }, 400)

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

    const { data: game } = await adminClient
      .from('community_games')
      .select('id, title, approved, rejection_message, user_id')
      .eq('id', game_id)
      .single()
    if (!game) return json({ error: 'Jogo não encontrado' }, 404)

    const reviewedGame = game as Game
    if (!reviewedGame.approved && !reviewedGame.rejection_message) {
      return json({ error: 'O jogo não possui motivo de reprovação' }, 400)
    }

    const { data: { user: recipient } } = await adminClient.auth.admin.getUserById(reviewedGame.user_id)
    if (!recipient?.email) return json({ skipped: 'Autor sem e-mail cadastrado' }, 200)

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('NOTIFICATION_FROM_EMAIL') ?? Deno.env.get('JOB_NOTIFICATION_FROM_EMAIL')
    const siteUrl = (Deno.env.get('PUBLIC_SITE_URL') ?? Deno.env.get('SITE_URL') ?? '').replace(/\/$/, '')

    if (!resendApiKey || !fromEmail) {
      return json({ error: 'Configure RESEND_API_KEY e NOTIFICATION_FROM_EMAIL.' }, 500)
    }

    const targetUrl = siteUrl ? `${siteUrl}/jogos/${reviewedGame.id}` : null
    const decision = reviewedGame.approved ? 'approved' : 'rejected'
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: recipient.email,
        subject: reviewedGame.approved
          ? `Seu jogo foi aprovado: ${reviewedGame.title}`
          : `Seu jogo precisa de ajustes: ${reviewedGame.title}`,
        html: emailHtml(reviewedGame, targetUrl),
      }),
    })

    if (!response.ok) {
      const message = await response.text()
      console.error('Resend rejected game review email', {
        gameId: reviewedGame.id,
        decision,
        status: response.status,
        message,
      })
      return json({ error: `Erro ao enviar e-mail: ${message}` }, 502)
    }

    return json({ sent: true, decision }, 200)
  } catch (error) {
    console.error('Unexpected game review email error', error)
    return json({ error: String(error) }, 500)
  }
})

function emailHtml(game: Game, targetUrl: string | null) {
  if (game.approved) {
    return `
      <div style="font-family: Arial, sans-serif; color: #18181b; line-height: 1.6; max-width: 520px;">
        <p style="font-size: 13px; font-weight: 700; color: #2F9E41; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em;">
          Jogo aprovado
        </p>
        <h1 style="font-size: 22px; margin: 0 0 16px;">${escapeHtml(game.title)}</h1>
        <p style="font-size: 15px; margin: 0 0 20px;">
          Seu jogo foi revisado e aprovado. Ele já está disponível na aba Jogos do ADS Conecta.
        </p>
        ${targetUrl ? `<a href="${escapeHtml(targetUrl)}" style="display: inline-block; background: #2F9E41; color: white; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px;">Ver jogo</a>` : ''}
        <p style="font-size: 12px; color: #71717a; margin-top: 28px; border-top: 1px solid #e4e4e7; padding-top: 16px;">
          Você recebeu este e-mail porque cadastrou um jogo no ADS Conecta.
        </p>
      </div>
    `
  }

  return `
    <div style="font-family: Arial, sans-serif; color: #18181b; line-height: 1.6; max-width: 520px;">
      <p style="font-size: 13px; font-weight: 700; color: #dc2626; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em;">
        Jogo precisa de ajustes
      </p>
      <h1 style="font-size: 22px; margin: 0 0 16px;">${escapeHtml(game.title)}</h1>
      <p style="font-size: 15px; margin: 0 0 8px;">A equipe responsável revisou seu jogo e deixou a seguinte orientação:</p>
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #991b1b; margin: 0 0 20px; padding: 12px 14px;">
        ${escapeHtml(game.rejection_message ?? '')}
      </div>
      ${targetUrl ? `<a href="${escapeHtml(targetUrl)}" style="display: inline-block; background: #2F9E41; color: white; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px;">Ver detalhes</a>` : ''}
      <p style="font-size: 12px; color: #71717a; margin-top: 28px; border-top: 1px solid #e4e4e7; padding-top: 16px;">
        Após realizar os ajustes, cadastre o jogo novamente na aba Jogos para uma nova avaliação.
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
