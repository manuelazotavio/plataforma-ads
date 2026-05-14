import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id } = await req.json()
    if (!user_id) return json({ error: 'user_id é obrigatório' }, 400)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Não autenticado' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const adminClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const callerClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user: caller } } = await callerClient.auth.getUser()
    if (!caller) return json({ error: 'Não autenticado' }, 401)
    if (caller.id === user_id) return json({ error: 'Você não pode excluir o próprio usuário.' }, 400)

    const { data: callerProfile } = await adminClient
      .from('users')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (callerProfile?.role !== 'admin') return json({ error: 'Acesso negado' }, 403)

    const { error: authError } = await adminClient.auth.admin.deleteUser(user_id)
    if (authError) return json({ error: authError.message }, 400)

    const { error: profileError } = await adminClient
      .from('users')
      .delete()
      .eq('id', user_id)

    if (profileError) return json({ error: 'Auth removido, mas erro ao remover perfil: ' + profileError.message }, 500)

    return json({ ok: true }, 200)
  } catch (error) {
    return json({ error: String(error) }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
