'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

type Reminder = {
  id: string
  event_id: string
  events: { id: string; title: string; start_date: string | null } | null
}

function formatLongDate(date: string | null) {
  if (!date) return ''
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function daysFromToday(date: string | null): number | null {
  if (!date) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [y, m, d] = date.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

function relativeLabel(date: string | null): string {
  const days = daysFromToday(date)
  if (days == null) return ''
  if (days === 0) return 'hoje'
  if (days === 1) return 'amanhã'
  return `em ${days} dias`
}

export default function ProfileEventReminders({ userId }: { userId: string }) {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const todayStr = new Date().toISOString().slice(0, 10)
      const { data, error: loadError } = await supabase
        .from('event_reminders')
        .select('id, event_id, events(id, title, start_date)')
        .eq('user_id', userId)
      if (loadError) {
        setError('Não foi possível carregar os lembretes.')
        setLoading(false)
        return
      }
      const rows = ((data ?? []) as unknown as Reminder[])
        .filter((r) => r.events && r.events.start_date && r.events.start_date >= todayStr)
        .sort((a, b) => (a.events!.start_date! < b.events!.start_date! ? -1 : 1))
      setReminders(rows)
      setLoading(false)
    }
    void load()
  }, [userId])

  async function remove(reminderId: string) {
    setRemovingId(reminderId)
    setError(null)
    const { error: removeError } = await supabase.from('event_reminders').delete().eq('id', reminderId)
    if (removeError) {
      setError('Não foi possível remover o lembrete.')
      setRemovingId(null)
      return
    }
    setReminders((prev) => prev.filter((r) => r.id !== reminderId))
    setRemovingId(null)
  }

  if (loading) return null
  if (reminders.length === 0) {
    return (
      <section className="py-6 border-b border-zinc-100">
        <h2 className="text-sm font-semibold text-zinc-900 mb-3">Lembretes de eventos</h2>
        {error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : (
          <p className="text-sm text-zinc-400">
            Você ainda não adicionou lembretes. Visite um evento e clique em <span className="font-medium text-zinc-600">Lembrar-me</span> para ser avisado.
          </p>
        )}
      </section>
    )
  }

  return (
    <section className="py-6 border-b border-zinc-100">
      <h2 className="text-sm font-semibold text-zinc-900 mb-3">
        Lembretes de eventos
        <span className="ml-2 text-xs font-normal text-zinc-400">
          {reminders.length} {reminders.length === 1 ? 'evento' : 'eventos'}
        </span>
      </h2>
      {error && <p className="mb-3 text-xs text-red-500">{error}</p>}
      <div className="flex flex-col gap-2">
        {reminders.map((r) => {
          const ev = r.events!
          return (
            <div key={r.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 px-4 py-3">
              <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-[#2F9E41]/10 text-[#2F9E41]">
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 2v4M16 2v4M3 10h18" />
                  <rect x={3} y={4} width={18} height={18} rx={2} />
                </svg>
              </div>
              <Link href={`/eventos/${ev.id}`} className="flex-1 min-w-0 truncate">
                <p className="text-sm font-semibold text-zinc-900 truncate">{ev.title}</p>
                <p className="text-xs text-zinc-400">
                  {formatLongDate(ev.start_date)} <span className="text-[#2F9E41] font-medium">· {relativeLabel(ev.start_date)}</span>
                </p>
              </Link>
              <button
                type="button"
                onClick={() => remove(r.id)}
                disabled={removingId === r.id}
                className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50"
                aria-label="Remover lembrete"
                title="Remover lembrete"
              >
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1={18} y1={6} x2={6} y2={18} />
                  <line x1={6} y1={6} x2={18} y2={18} />
                </svg>
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
