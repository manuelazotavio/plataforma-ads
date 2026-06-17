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
  const [loginPromptOpen, setLoginPromptOpen] = useState(false)

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
      <>
        <button
          type="button"
          onClick={() => setLoginPromptOpen(true)}
          className="inline-flex items-center justify-center rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900"
        >
          Entrar para receber notificações
        </button>
        {loginPromptOpen && (
          <LoginPromptModal onClose={() => setLoginPromptOpen(false)} />
        )}
      </>
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

function LoginPromptModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="bg-green-50 px-6 py-6">
          <LoginPromptIllustration />
        </div>
        <div className="px-6 py-5">
          <h2 className="text-lg font-bold text-zinc-900">Entre para ativar os alertas</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            Você precisa estar logado para receber por e-mail as novas oportunidades cadastradas.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-50"
            >
              Agora não
            </button>
            <Link
              href="/login"
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#2F9E41] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Ir para login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function LoginPromptIllustration() {
  return (
    <svg viewBox="0 0 360 180" role="img" aria-label="Ícone de e-mail" className="h-36 w-full">
      <circle cx="180" cy="90" r="62" fill="#dcfce7" />
      <rect x="118" y="58" width="124" height="84" rx="18" fill="#ffffff" />
      <path
        d="M136 78h88a8 8 0 0 1 8 8v44a8 8 0 0 1-8 8h-88a8 8 0 0 1-8-8V86a8 8 0 0 1 8-8Z"
        fill="none"
        stroke="#2F9E41"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m130 85 50 36 50-36"
        fill="none"
        stroke="#2F9E41"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

