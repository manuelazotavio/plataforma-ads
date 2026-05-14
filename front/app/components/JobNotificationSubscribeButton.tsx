'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getAuthUser } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export default function JobNotificationSubscribeButton() {
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscribed, setSubscribed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const user = await getAuthUser()
      if (cancelled) return

      if (!user) {
        setLoading(false)
        return
      }

      setUserId(user.id)
      const { data } = await supabase
        .from('job_notification_subscriptions')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!cancelled) {
        setSubscribed(!!data)
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  async function toggleSubscription() {
    if (!userId) return
    setSaving(true)
    setError(null)

    const { error: toggleError } = subscribed
      ? await supabase.from('job_notification_subscriptions').delete().eq('user_id', userId)
      : await supabase.from('job_notification_subscriptions').insert({ user_id: userId })

    setSaving(false)
    if (toggleError) {
      setError('Não foi possível atualizar sua preferência. Tente novamente.')
      return
    }

    setSubscribed((current) => !current)
  }

  if (loading) {
    return <div className="h-10 w-full rounded-xl bg-zinc-100 sm:w-64" />
  }

  if (!userId) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center justify-center rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900"
      >
        Entrar para receber notificações
      </Link>
    )
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={toggleSubscription}
        disabled={saving}
        className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
          subscribed
            ? 'border border-[#2F9E41]/30 bg-[#2F9E41]/10 text-[#2F9E41] hover:bg-[#2F9E41]/15'
            : 'border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
        }`}
      >
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 4h16v16H4z" />
          <path d="m22 6-10 7L2 6" />
        </svg>
        {saving
          ? 'Salvando...'
          : subscribed
            ? 'Notificações ativadas'
            : 'Receber notificação ao ter novas oportunidades'}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

