'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthUser } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function finishLogin() {
      const authUser = await getAuthUser()
      if (!active) return

      if (!authUser) {
        setError('Nao foi possivel concluir o login com Google.')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id')
        .eq('id', authUser.id)
        .maybeSingle()

      if (!active) return

      if (profileError) {
        setError('Login feito, mas nao foi possivel verificar seu perfil: ' + profileError.message)
        return
      }

      if (!profile) {
        const metadata = authUser.user_metadata as Record<string, string | undefined>
        const name =
          metadata.full_name || metadata.name || authUser.email?.split('@')[0] || 'Usuario'
        const avatarUrl = metadata.avatar_url || metadata.picture || null

        const { error: insertError } = await supabase.from('users').insert({
          id: authUser.id,
          name,
          email: authUser.email ?? null,
          password_hash: 'managed_by_supabase_oauth',
          role: 'aluno',
          avatar_url: avatarUrl,
        })

        if (!active) return

        if (insertError) {
          setError('Login feito, mas nao foi possivel criar seu perfil: ' + insertError.message)
          return
        }
      }

      router.replace('/')
    }

    finishLogin()

    return () => {
      active = false
    }
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        {error ? (
          <>
            <h1 className="text-xl font-semibold text-zinc-900">Nao foi possivel entrar</h1>
            <p className="mt-3 text-sm text-zinc-600">{error}</p>
            <Link
              href="/login"
              className="mt-6 inline-flex rounded-lg bg-[#2F9E41] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              Voltar para o login
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-zinc-900">Concluindo login...</h1>
            <p className="mt-3 text-sm text-zinc-500">Estamos preparando seu perfil.</p>
          </>
        )}
      </div>
    </div>
  )
}
