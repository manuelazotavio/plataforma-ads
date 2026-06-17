'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

const NPS_DISMISS_DAYS = 14

export default function NpsSatisfactionPrompt({ userId }: { userId: string | null }) {
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [thankYouOpen, setThankYouOpen] = useState(false)

  useEffect(() => {
    if (!userId) {
      return
    }

    const uid = userId
    let cancelled = false
    async function load() {
      const dismissedUntil = localStorage.getItem(npsDismissKey(uid))
      if (dismissedUntil && new Date(dismissedUntil) > new Date()) return

      const { data } = await supabase
        .from('nps_responses')
        .select('score, comment')
        .eq('user_id', uid)
        .maybeSingle()

      if (cancelled) return
      if (data) {
        return
      }
      setReady(true)
      setOpen(true)
    }

    load()
    return () => { cancelled = true }
  }, [userId])

  function dismiss() {
    if (userId) localStorage.setItem(npsDismissKey(userId), addDays(new Date(), NPS_DISMISS_DAYS).toISOString())
    setReady(false)
    setOpen(false)
  }

  async function submit() {
    if (!userId || score === null) return
    setSaving(true)
    setError(null)

    const { error: saveError } = await supabase
      .from('nps_responses')
      .upsert({
        user_id: userId,
        score,
        comment: comment.trim() || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    setSaving(false)
    if (saveError) {
      setError('Não foi possível salvar sua avaliação. Tente novamente.')
      return
    }

    setThankYouOpen(true)
  }

  if (!userId || !ready) return null

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" onClick={dismiss}>
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            {thankYouOpen ? (
              <>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#2F9E41]/10 text-[#2F9E41]">
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-zinc-900">Obrigado pela avaliação!</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                  Sua resposta ajuda a melhorar a plataforma para toda a comunidade ADS.
                </p>
                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => { setOpen(false); setReady(false) }}
                    className="rounded-lg bg-[#2F9E41] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                  >
                    Fechar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#2F9E41]/10 text-[#2F9E41]">
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-zinc-900">Como você avalia a plataforma?</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                  De 0 a 10, qual a chance de você recomendar o ADS Conecta para outro aluno ou professor?
                </p>

                <div className="mt-5 grid grid-cols-11 gap-1">
                  {Array.from({ length: 11 }, (_, value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setScore(value)}
                      className={`h-9 rounded-lg text-sm font-bold transition ${
                        score === value
                          ? 'bg-[#2F9E41] text-white'
                          : 'border border-zinc-200 text-zinc-600 hover:border-[#2F9E41]/50 hover:bg-green-50'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[11px] font-medium text-zinc-400">
                  <span>Nada provável</span>
                  <span>Muito provável</span>
                </div>

                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className="mt-5 w-full resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-[#2F9E41] focus:ring-2 focus:ring-green-100"
                  placeholder="Quer deixar um comentário? O que podemos melhorar?"
                />
                {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={dismiss}
                    className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
                  >
                    Agora não
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={score === null || saving}
                    className="rounded-lg bg-[#2F9E41] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50 sm:flex-1"
                  >
                    {saving ? 'Salvando...' : 'Enviar avaliação'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function npsDismissKey(userId: string) {
  return `nps_prompt_dismissed_until:${userId}`
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}
