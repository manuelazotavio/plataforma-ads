'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { calendarItemChip, type CalendarItem } from '@/app/lib/calendarItems'

type CalendarEntry = {
  id: string
  title: string
  start_date: string
  end_date: string | null
  kind: 'event' | 'item'
  category?: string | null
  color?: string | null
  url?: string | null
  description?: string | null
}

type Evento = {
  id: string
  title: string
  start_date: string
  end_date: string | null
  category: string | null
}

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const CATEGORY_COLORS: Record<string, string> = {
  'Hackathon': 'bg-blue-100 text-blue-700',
  'Palestra': 'bg-purple-100 text-purple-700',
  'Workshop': 'bg-orange-100 text-orange-700',
  'Maratona': 'bg-red-100 text-red-700',
}

function categoryColor(cat: string | null) {
  return cat && CATEGORY_COLORS[cat] ? CATEGORY_COLORS[cat] : 'bg-[#2F9E41]/10 text-[#2F9E41]'
}

function parseLocal(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatRange(start: string, end: string | null) {
  const fmt = (s: string) =>
    parseLocal(s).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
  if (!end || end === start) return fmt(start)
  return `${fmt(start)} — ${fmt(end)}`
}

export default function CalendarioPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [entries, setEntries] = useState<CalendarEntry[]>([])
  const [selectedItem, setSelectedItem] = useState<CalendarEntry | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const start = new Date(year, month, 1).toISOString().split('T')[0]
    const end = new Date(year, month + 1, 0).toISOString().split('T')[0]

    void Promise.all([
      supabase
        .from('events')
        .select('id, title, start_date, end_date, category')
        .lte('start_date', end)
        .or(`start_date.gte.${start},end_date.gte.${start}`)
        .eq('is_active', true),
      supabase
        .from('calendar_items')
        .select('id, title, description, start_date, end_date, color, url')
        .lte('start_date', end)
        .or(`start_date.gte.${start},end_date.gte.${start}`)
        .eq('is_active', true),
    ]).then(([{ data: events }, { data: items }]) => {
      const eventEntries: CalendarEntry[] = ((events ?? []) as Evento[]).map((ev) => ({
        id: `event:${ev.id}`,
        title: ev.title,
        start_date: ev.start_date,
        end_date: ev.end_date,
        kind: 'event',
        category: ev.category,
      }))
      const itemEntries: CalendarEntry[] = ((items ?? []) as Pick<CalendarItem, 'id' | 'title' | 'description' | 'start_date' | 'end_date' | 'color' | 'url'>[]).map((it) => ({
        id: `item:${it.id}`,
        title: it.title,
        description: it.description,
        start_date: it.start_date,
        end_date: it.end_date,
        kind: 'item',
        color: it.color,
        url: it.url,
      }))
      setEntries([...eventEntries, ...itemEntries])
    })
  }, [year, month])

  useEffect(() => {
    if (!selectedItem) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setSelectedItem(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [selectedItem])

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  function goToday() {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
  }

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const cells: { date: Date; current: boolean }[] = []
  for (let i = firstDay - 1; i >= 0; i--)
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), current: false })
  for (let i = 1; i <= daysInMonth; i++)
    cells.push({ date: new Date(year, month, i), current: true })
  const remaining = 42 - cells.length
  for (let i = 1; i <= remaining; i++)
    cells.push({ date: new Date(year, month + 1, i), current: false })

  function eventsForDay(date: Date) {
    const day = date.getTime()
    return entries
      .map(e => {
        const start = parseLocal(e.start_date)
        const end = e.end_date ? parseLocal(e.end_date) : start
        if (day < start.getTime() || day > end.getTime()) return null
        return {
          ...e,
          isStart: day === start.getTime(),
          isEnd:   day === end.getTime(),
        }
      })
      .filter(Boolean) as (CalendarEntry & { isStart: boolean; isEnd: boolean })[]
  }

  function isToday(date: Date) {
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-white dark:bg-zinc-950">
      <div className="flex shrink-0 items-center gap-3 border-b border-zinc-100 px-4 py-4 dark:border-zinc-800 md:px-8">
        <h1 className="text-xl font-bold capitalize text-zinc-900 dark:text-zinc-100">
          {MONTHS[month]} de {year}
        </h1>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={goToday}
            className="mr-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Hoje
          </button>
          <button onClick={prevMonth} className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-200">
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button onClick={nextMonth} className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-200">
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-7 border-b border-zinc-100 dark:border-zinc-800">
        {DAYS.map(d => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-zinc-400">
            {d}
          </div>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-7 grid-rows-6 overflow-hidden border-l border-zinc-100 dark:border-zinc-800">
        {cells.map((cell, i) => {
          const dayEvents = eventsForDay(cell.date)
          const shown = dayEvents.slice(0, 3)
          const overflow = dayEvents.length - 3
          const todayCell = isToday(cell.date)

          return (
            <div
              key={i}
              className={`flex min-h-0 flex-col overflow-hidden border-b border-r border-zinc-100 p-1.5 dark:border-zinc-800 ${
                !cell.current ? 'bg-zinc-50/60 dark:bg-zinc-900/45' : 'bg-white dark:bg-zinc-950'
              }`}
            >
              <span className={`text-xs font-bold self-start w-6 h-6 flex items-center justify-center rounded-full shrink-0 ${
                todayCell
                  ? 'bg-[#2F9E41] text-white'
                  : cell.current
                  ? 'text-zinc-800 dark:text-zinc-100'
                  : 'text-zinc-300 dark:text-zinc-600'
              }`}>
                {cell.date.getDate()}
              </span>

              <div className="mt-1 flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
                {shown.map(ev => {
                  const rawId = ev.id.split(':')[1]
                  const colorClass = ev.kind === 'event'
                    ? categoryColor(ev.category ?? null)
                    : calendarItemChip(ev.color ?? null)
                  const shape = ev.isStart && ev.isEnd ? 'rounded' : ev.isStart ? 'rounded-l' : ev.isEnd ? 'rounded-r' : ''
                  const cls = `min-h-5 shrink-0 text-xs font-medium px-1.5 py-0.5 truncate transition hover:opacity-80 ${colorClass} ${shape}`
                  const label = ev.isStart ? ev.title : ' '

                  if (ev.kind === 'event') {
                    return (
                      <Link key={ev.id} href={`/eventos/${rawId}?from=calendario`} title={ev.title} className={cls}>
                        {label}
                      </Link>
                    )
                  }
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      title={ev.title}
                      className={`${cls} text-left w-full`}
                      onClick={() => setSelectedItem(ev)}
                    >
                      {label}
                    </button>
                  )
                })}

                {overflow > 0 && (
                  <span className="shrink-0 px-1.5 text-xs text-zinc-400">+ {overflow} mais</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="item-modal-title"
          onClick={() => setSelectedItem(null)}
        >
          <div
            ref={modalRef}
            className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-1 flex items-start justify-between gap-4">
              <h2 id="item-modal-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {selectedItem.title}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                aria-label="Fechar"
              >
                <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              {formatRange(selectedItem.start_date, selectedItem.end_date)}
            </p>

            {selectedItem.description && (
              <p className="mb-4 whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">
                {selectedItem.description}
              </p>
            )}

            {selectedItem.url && (
              <a
                href={selectedItem.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-[#2F9E41] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1={10} y1={14} x2={21} y2={3} />
                </svg>
                Abrir link
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
