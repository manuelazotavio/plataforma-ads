'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { getAuthUser } from '@/app/lib/auth'

type Props = {
  eventId: string
  startDate: string | null
}

export default function EventReminderButton({ eventId, startDate }: Props) {
  const router = useRouter()
  const todayStr = new Date().toISOString().slice(0, 10)
  const eventNotStarted = !!startDate && startDate >= todayStr
  const [userId, setUserId] = useState<string | null>(null)
  const [active, setActive] = useState(false)
  const [loading, setLoading] = useState(eventNotStarted)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!eventNotStarted) return

    async function load() {
      const user = await getAuthUser()
      if (!user) {
        setLoading(false)
        return
      }

      setUserId(user.id)
      const { data, error: loadError } = await supabase
        .from('event_reminders')
        .select('id')
        .eq('user_id', user.id)
        .eq('event_id', eventId)
        .maybeSingle()

      if (loadError) {
        setError('Não foi possível consultar seu lembrete.')
      } else {
        setActive(!!data)
      }
      setLoading(false)
    }

    void load()
  }, [eventId, eventNotStarted])

  if (!eventNotStarted || loading) return null

  async function toggle() {
    if (!userId) {
      router.push('/login')
      return
    }
    if (busy) return

    setBusy(true)
    setError(null)

    const { error: toggleError } = active
      ? await supabase.from('event_reminders').delete().eq('user_id', userId).eq('event_id', eventId)
      : await supabase.from('event_reminders').insert({ user_id: userId, event_id: eventId })

    if (toggleError) {
      setError('Não foi possível atualizar o lembrete. Tente novamente.')
      setBusy(false)
      return
    }

    setActive((current) => !current)
    setBusy(false)
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-base font-semibold transition disabled:opacity-50 ${
          active
            ? 'border-[#2F9E41] bg-[#2F9E41]/10 text-[#2F9E41] hover:bg-[#2F9E41]/15'
            : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
        }`}
        title={active ? 'Remover lembrete' : 'Você será notificado 3 dias e 1 dia antes do evento'}
      >
        {active ? (
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2v4M16 2v4M3 10h18" />
            <rect x={3} y={4} width={18} height={18} rx={2} />
            <path d="m9 16 2 2 4-4" />
          </svg>
        ) : (
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2v4M16 2v4M3 10h18" />
            <rect x={3} y={4} width={18} height={18} rx={2} />
          </svg>
        )}
        {busy ? 'Salvando...' : active ? 'Lembrete ativado' : 'Lembrar-me'}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
