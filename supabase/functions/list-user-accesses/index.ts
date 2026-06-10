import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    const { data: callerProfile } = await adminClient
      .from('users')
      .select('role')
      .eq('id', caller.id)
      .single()
    if (callerProfile?.role !== 'admin') return json({ error: 'Acesso negado' }, 403)

    const accesses: Record<string, string | null> = {}
    const perPage = 1000
    let page = 1

    while (true) {
      const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage })
      if (error) return json({ error: error.message }, 400)

      for (const user of data.users) {
        accesses[user.id] = user.last_sign_in_at ?? null
      }

      if (data.users.length < perPage) break
      page += 1
    }

    return json({ accesses }, 200)
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
