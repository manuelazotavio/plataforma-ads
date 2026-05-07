'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

type Evento = {
  id: string
  title: string
  start_date: string
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
  return cat && CATEGORY_COLORS[cat] ? CATEGORY_COLORS[cat] : 'bg-[#0B7A3B]/10 text-[#0B7A3B]'
}

export default function CalendarioPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [eventos, setEventos] = useState<Evento[]>([])

  useEffect(() => {
    const start = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const end = new Date(year, month + 2, 0).toISOString().split('T')[0]

    supabase
      .from('eventos')
      .select('id, title, start_date, category')
      .gte('start_date', start)
      .lte('start_date', end)
      .eq('is_active', true)
      .then(({ data }) => setEventos(data ?? []))
  }, [year, month])

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
    const str = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    return eventos.filter(e => e.start_date.startsWith(str))
  }

  function isToday(date: Date) {
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">

      
      <div className="flex items-center gap-3 px-4 md:px-8 py-4 border-b border-zinc-100 shrink-0">
        <h1 className="text-xl font-bold text-zinc-900 capitalize">
          {MONTHS[month]} de {year}
        </h1>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-sm font-medium text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition mr-1"
          >
            Hoje
          </button>
          <button onClick={prevMonth} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition">
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button onClick={nextMonth} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition">
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      
      <div className="grid grid-cols-7 border-b border-zinc-100 shrink-0">
        {DAYS.map(d => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

     
      <div className="flex-1 grid grid-cols-7 grid-rows-6 border-l border-zinc-100 overflow-hidden">
        {cells.map((cell, i) => {
          const dayEvents = eventsForDay(cell.date)
          const shown = dayEvents.slice(0, 3)
          const overflow = dayEvents.length - 3
          const todayCell = isToday(cell.date)

          return (
            <div
              key={i}
              className={`border-r border-b border-zinc-100 p-1.5 flex flex-col gap-1 overflow-hidden ${
                !cell.current ? 'bg-zinc-50/60' : 'bg-white'
              }`}
            >
              <span className={`text-xs font-bold self-start w-6 h-6 flex items-center justify-center rounded-full shrink-0 ${
                todayCell
                  ? 'bg-[#0B7A3B] text-white'
                  : cell.current
                  ? 'text-zinc-800'
                  : 'text-zinc-300'
              }`}>
                {cell.date.getDate()}
              </span>

              {shown.map(ev => (
                <Link
                  key={ev.id}
                  href={`/eventos/${ev.id}`}
                  className={`text-xs font-medium px-1.5 py-0.5 rounded truncate transition hover:opacity-80 ${categoryColor(ev.category)}`}
                >
                  {ev.title}
                </Link>
              ))}

              {overflow > 0 && (
                <span className="text-xs text-zinc-400 px-1.5">+ {overflow} mais</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
