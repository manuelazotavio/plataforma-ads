export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { calendarItemChip } from '@/app/lib/calendarItems'

type EventRow = {
  id: string
  title: string
  start_date: string
  end_date: string | null
  category: string | null
}

type ItemRow = {
  id: string
  title: string
  description: string | null
  start_date: string
  end_date: string | null
  color: string | null
  url: string | null
}

const CATEGORY_COLORS: Record<string, string> = {
  Hackathon: 'bg-blue-100 text-blue-700',
  Palestra: 'bg-purple-100 text-purple-700',
  Workshop: 'bg-orange-100 text-orange-700',
  Maratona: 'bg-red-100 text-red-700',
}

function categoryColor(cat: string | null) {
  return cat && CATEGORY_COLORS[cat] ? CATEGORY_COLORS[cat] : 'bg-[#2F9E41]/10 text-[#2F9E41]'
}

function formatRange(start: string, end: string | null) {
  const fmt = (s: string) => {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  if (!end || end === start) return fmt(start)
  return `${fmt(start)} — ${fmt(end)}`
}

export default async function CalendarioDiaPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound()

  const [y, m, d] = date.split('-').map(Number)
  const dateObj = new Date(y, m - 1, d)

  const [{ data: rawEvents }, { data: rawItems }] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, start_date, end_date, category')
      .lte('start_date', date)
      .or(`end_date.gte.${date},end_date.is.null`)
      .eq('is_active', true),
    supabase
      .from('calendar_items')
      .select('id, title, description, start_date, end_date, color, url')
      .lte('start_date', date)
      .or(`end_date.gte.${date},end_date.is.null`)
      .eq('is_active', true),
  ])

  const events = ((rawEvents ?? []) as EventRow[]).filter((e) => e.end_date !== null || e.start_date === date)
  const items = ((rawItems ?? []) as ItemRow[]).filter((i) => i.end_date !== null || i.start_date === date)

  const formattedDate = dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const total = events.length + items.length

  return (
    <div className="min-h-screen bg-white px-4 py-8 dark:bg-zinc-950 md:px-8">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/calendario"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Calendário
        </Link>

        <div className="mt-4 mb-8">
          <h1 className="text-2xl font-bold capitalize text-zinc-900 dark:text-zinc-100">{formattedDate}</h1>
          {total > 0 && (
            <p className="mt-1 text-sm text-zinc-500">
              {total} {total === 1 ? 'evento' : 'eventos'}
            </p>
          )}
        </div>

        {total === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 px-6 py-16 text-center dark:border-zinc-800">
            <p className="text-sm text-zinc-400">Nenhum evento neste dia.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {events.map((ev) => (
              <Link
                key={ev.id}
                href={`/eventos/${ev.id}?from=calendario`}
                className="group flex flex-col gap-3 rounded-2xl border border-zinc-100 bg-white p-5 transition hover:border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-zinc-900 group-hover:text-zinc-700 dark:text-zinc-100">{ev.title}</p>
                  {ev.category && (
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${categoryColor(ev.category)}`}>
                      {ev.category}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400">{formatRange(ev.start_date, ev.end_date)}</p>
              </Link>
            ))}

            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-2xl border border-zinc-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.title}</p>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${calendarItemChip(item.color ?? null)}`}>
                    Item
                  </span>
                </div>
                <p className="text-xs text-zinc-400">{formatRange(item.start_date, item.end_date)}</p>
                {item.description && (
                  <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{item.description}</p>
                )}
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-[#2F9E41] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                  >
                    Abrir link
                    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1={10} y1={14} x2={21} y2={3} />
                    </svg>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
