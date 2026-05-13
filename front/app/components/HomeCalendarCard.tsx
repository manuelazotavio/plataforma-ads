'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export type HomeCalendarEvent = {
  id: string
  title: string
  category: string | null
  start_date: string | null
  end_date: string | null
}

const CATEGORY_COLOR: Record<string, string> = {
  hackathon: 'bg-purple-400',
  maratona: 'bg-blue-400',
  extensao: 'bg-amber-400',
  iniciacao_cientifica: 'bg-rose-400',
}

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const DAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function eventColor(category: string | null) {
  return category ? (CATEGORY_COLOR[category] ?? 'bg-zinc-400') : 'bg-zinc-400'
}

function parseLocalDate(str: string) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatEventDate(event: HomeCalendarEvent) {
  if (!event.start_date) return ''

  const start = parseLocalDate(event.start_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
  if (!event.end_date || event.end_date === event.start_date) return start

  const end = parseLocalDate(event.end_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
  return `${start} - ${end}`
}

export default function HomeCalendarCard({ events }: { events: HomeCalendarEvent[] }) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const today = now.getDate()
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  function eventsOnDay(day: number): HomeCalendarEvent[] {
    const d = new Date(year, month, day)
    return events.filter((e) => {
      if (!e.start_date) return false
      const start = parseLocalDate(e.start_date)
      const end = e.end_date ? parseLocalDate(e.end_date) : new Date(start)
      end.setHours(23, 59, 59, 999)
      return d >= start && d <= end
    })
  }

  const todayMidnight = new Date(year, month, today)
  const nextEvents = events
    .filter((e) => {
      if (!e.start_date) return false
      const end = e.end_date ? parseLocalDate(e.end_date) : parseLocalDate(e.start_date)
      return end >= todayMidnight
    })
    .slice(0, 4)

  const selectedEvents = selectedDay ? eventsOnDay(selectedDay) : []
  const selectedDate = selectedDay ? new Date(year, month, selectedDay) : null

  useEffect(() => {
    if (selectedDay === null) return

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setSelectedDay(null)
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [selectedDay])

  return (
    <>
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-900">Calendário</h3>
          <Link href="/calendario" className="text-xs font-medium text-green-600 hover:text-green-700 transition">Ver mais →</Link>
        </div>
        <p className="mb-3 text-sm font-semibold text-zinc-500">{MONTH_NAMES[month]} {year}</p>
        <div className="mb-1 grid grid-cols-7">
          {DAY_LABELS.map((day, i) => (
            <div key={i} className="pb-1 text-center text-[11px] font-medium text-zinc-400">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, i) => {
            const dayEvents = day ? eventsOnDay(day) : []
            const isToday = day === today
            return (
              <div key={i} className="flex flex-col items-center gap-0.5">
                {day !== null && (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-green-200 ${
                        isToday ? 'font-bold text-white hover:opacity-90' : dayEvents.length > 0 ? 'text-zinc-900 font-semibold' : 'text-zinc-500'
                      }`}
                      style={isToday ? { backgroundColor: '#2F9E41' } : undefined}
                      aria-label={`Ver eventos de ${day} de ${MONTH_NAMES[month]}`}
                    >
                      {day}
                    </button>
                    {dayEvents.length > 0 && (
                      <span className={`h-1.5 w-1.5 rounded-full ${eventColor(dayEvents[0].category)}`} />
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>

        {nextEvents.length > 0 ? (
          <div className="mt-4 flex flex-col gap-2 border-t border-zinc-100 pt-3">
            {nextEvents.map((e) => (
              <Link key={e.id} href="/eventos" className="flex items-start gap-2.5 rounded-lg px-1 py-1 hover:bg-zinc-50 transition group">
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${eventColor(e.category)}`} />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-800 truncate group-hover:text-zinc-900">{e.title}</p>
                  {e.start_date && (
                    <p className="text-[11px] text-zinc-400 mt-0.5">{formatEventDate(e)}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-4 border-t border-zinc-100 pt-3">
            <p className="text-xs text-zinc-400 text-center">Nenhum evento próximo</p>
          </div>
        )}
      </div>

      {selectedDay !== null && selectedDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="home-calendar-modal-title"
          onClick={() => setSelectedDay(null)}
        >
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 id="home-calendar-modal-title" className="text-base font-semibold text-zinc-900">
                  Eventos do dia
                </h3>
                <p className="mt-0.5 text-sm text-zinc-500">
                  {selectedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="Fechar"
              >
                <CloseIcon />
              </button>
            </div>

            {selectedEvents.length > 0 ? (
              <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
                {selectedEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/eventos/${event.id}`}
                    onClick={() => setSelectedDay(null)}
                    className="flex items-start gap-3 rounded-xl border border-zinc-100 px-3 py-3 transition hover:border-zinc-200 hover:bg-zinc-50"
                  >
                    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${eventColor(event.category)}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-zinc-900">{event.title}</p>
                      {event.start_date && <p className="mt-1 text-xs text-zinc-400">{formatEventDate(event)}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center">
                <p className="text-sm text-zinc-400">Nenhum evento nesse dia.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function CloseIcon() {
  return (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}
