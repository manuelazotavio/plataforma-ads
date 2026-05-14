'use client'

import { useEffect, useRef, useState } from 'react'

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const WEEK_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const today = new Date()
today.setHours(0, 0, 0, 0)

function toISO(d: Date) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

const todayISO = toISO(today)

function parseISO(s: string): Date | null {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d || isNaN(y)) return null
  return new Date(y, m - 1, d)
}

function formatPT(s: string) {
  const d = parseISO(s)
  if (!d) return ''
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function buildGrid(year: number, month: number) {
  const firstWeekday = new Date(year, month, 1).getDay()
  const lastDay = new Date(year, month + 1, 0).getDate()
  const prevLastDay = new Date(year, month, 0).getDate()
  const cells: { d: Date; cur: boolean }[] = []

  for (let i = firstWeekday - 1; i >= 0; i--)
    cells.push({ d: new Date(year, month - 1, prevLastDay - i), cur: false })

  for (let d = 1; d <= lastDay; d++)
    cells.push({ d: new Date(year, month, d), cur: true })

  let n = 1
  while (cells.length < 42)
    cells.push({ d: new Date(year, month + 1, n++), cur: false })

  return cells
}

type Props = {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

const DEFAULT_CLS =
  'rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 transition w-full'

export default function DatePicker({
  value,
  onChange,
  placeholder = 'Selecionar data',
  className,
  disabled,
}: Props) {
  const sel = parseISO(value)
  const [open, setOpen] = useState(false)
  const [vy, setVy] = useState(sel?.getFullYear() ?? today.getFullYear())
  const [vm, setVm] = useState(sel?.getMonth() ?? today.getMonth())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      const d = parseISO(value)
      setVy(d?.getFullYear() ?? today.getFullYear())
      setVm(d?.getMonth() ?? today.getMonth())
    }
  }, [open, value])

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  function prev() {
    if (vm === 0) { setVm(11); setVy((y) => y - 1) }
    else setVm((m) => m - 1)
  }

  function next() {
    if (vm === 11) { setVm(0); setVy((y) => y + 1) }
    else setVm((m) => m + 1)
  }

  const grid = buildGrid(vy, vm)
  const cls = className ?? DEFAULT_CLS

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`flex items-center justify-between gap-2 text-left cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${cls}`}
      >
        <span className={value ? 'text-zinc-900' : 'text-zinc-400'}>
          {value ? formatPT(value) : placeholder}
        </span>
        <svg
          className="shrink-0 text-zinc-400"
          width={15}
          height={15}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 w-72 select-none rounded-2xl border border-zinc-100 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <button
              type="button"
              onClick={prev}
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 transition"
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <span className="text-sm font-semibold text-zinc-800 tracking-wide">
              {MONTHS_PT[vm]} {vy}
            </span>

            <button
              type="button"
              onClick={next}
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 transition"
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 px-3 pb-1">
            {WEEK_PT.map((w) => (
              <span
                key={w}
                className="flex h-8 items-center justify-center text-[11px] font-medium text-zinc-400"
              >
                {w}
              </span>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-0.5 px-3 pb-3">
            {grid.map(({ d, cur }) => {
              const iso = toISO(d)
              const isSelected = iso === value
              const isToday = iso === todayISO

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => { onChange(iso); setOpen(false) }}
                  className={[
                    'flex h-9 w-9 mx-auto items-center justify-center rounded-full text-sm transition',
                    isSelected
                      ? 'bg-[#2F9E41] text-white font-semibold shadow-sm'
                      : isToday
                      ? 'border border-[#2F9E41]/50 text-[#2F9E41] font-semibold hover:bg-[#2F9E41]/10'
                      : cur
                      ? 'text-zinc-800 hover:bg-zinc-100'
                      : 'text-zinc-300 hover:bg-zinc-50',
                  ].join(' ')}
                >
                  {d.getDate()}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          {value && (
            <div className="border-t border-zinc-100 px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs text-zinc-500">{formatPT(value)}</span>
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false) }}
                className="text-xs text-zinc-400 hover:text-zinc-700 transition"
              >
                Limpar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
