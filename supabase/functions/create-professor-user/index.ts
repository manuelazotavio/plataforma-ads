import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { professor_id, email, password } = await req.json()

    if (!professor_id || !email || !password) {
      return json({ error: 'professor_id, email e password são obrigatórios' }, 400)
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

    const { data: callerProfile } = await adminClient
      .from('users').select('role').eq('id', caller.id).single()
    if (callerProfile?.role !== 'admin') return json({ error: 'Acesso negado' }, 403)

    // Busca o professor para usar o nome
    const { data: prof } = await adminClient
      .from('professors').select('name, user_id').eq('id', professor_id).single()

    if (!prof) return json({ error: 'Professor não encontrado' }, 404)
    if (prof.user_id) return json({ error: 'Este professor já possui acesso vinculado' }, 409)

  
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (authError) return json({ error: authError.message }, 400)

    const newUserId = authData.user.id

    
    const { error: userError } = await adminClient.from('users').insert({
      id: newUserId,
      name: prof.name,
      email,
      role: 'professor',
    })
    if (userError) {
      await adminClient.auth.admin.deleteUser(newUserId)
      return json({ error: 'Erro ao criar perfil: ' + userError.message }, 500)
    }

  
    await adminClient.from('professors').update({ user_id: newUserId }).eq('id', professor_id)

    return json({ user_id: newUserId }, 200)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
