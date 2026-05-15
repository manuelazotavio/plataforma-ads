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
  const parsed = new Date(y, m - 1, d)
  if (parsed.getFullYear() !== y || parsed.getMonth() !== m - 1 || parsed.getDate() !== d) return null
  return parsed
}

function parseTypedDate(s: string): string | null {
  const trimmed = s.trim()
  if (!trimmed) return ''

  const iso = parseISO(trimmed)
  if (iso) return toISO(iso)

  const match = trimmed.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/)
  if (!match) return null

  const [, day, month, year] = match
  const parsed = new Date(Number(year), Number(month) - 1, Number(day))
  if (
    parsed.getFullYear() !== Number(year) ||
    parsed.getMonth() !== Number(month) - 1 ||
    parsed.getDate() !== Number(day)
  ) {
    return null
  }

  return toISO(parsed)
}

function formatInput(s: string) {
  const d = parseISO(s)
  if (!d) return ''
  return d.toLocaleDateString('pt-BR')
}

function formatLongPT(s: string) {
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
  const [typed, setTyped] = useState(formatInput(value))
  const [vy, setVy] = useState(sel?.getFullYear() ?? today.getFullYear())
  const [vm, setVm] = useState(sel?.getMonth() ?? today.getMonth())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTyped(formatInput(value))
  }, [value])

  // Ao abrir o calendário, posiciona a visualização na data digitada ou selecionada
  useEffect(() => {
    if (!open) return
    const typedISO = parseTypedDate(typed)
    const d = typedISO ? parseISO(typedISO) : parseISO(value)
    setVy(d?.getFullYear() ?? today.getFullYear())
    setVm(d?.getMonth() ?? today.getMonth())
    // Só roda quando o calendário abre — a navegação durante a digitação é feita no handleTypedChange
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

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

  function commitTypedDate() {
    const parsed = parseTypedDate(typed)
    if (parsed !== null) {
      onChange(parsed)
      if (parsed) {
        const d = parseISO(parsed)
        setVy(d?.getFullYear() ?? today.getFullYear())
        setVm(d?.getMonth() ?? today.getMonth())
      }
      return
    }

    setTyped(formatInput(value))
  }

  function applyMask(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    if (digits.length <= 2) return digits
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
  }

  function handleTypedChange(nextTyped: string) {
    const masked = applyMask(nextTyped)
    setTyped(masked)
    const parsed = parseTypedDate(masked)
    if (parsed !== null) {
      onChange(parsed)
      if (parsed) {
        const d = parseISO(parsed)
        setVy(d?.getFullYear() ?? today.getFullYear())
        setVm(d?.getMonth() ?? today.getMonth())
      }
    }
  }

  const grid = buildGrid(vy, vm)
  const cls = className ?? DEFAULT_CLS

  return (
    <div ref={ref} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          disabled={disabled}
          value={typed}
          onChange={(e) => handleTypedChange(e.target.value)}
          onFocus={() => !disabled && setOpen(true)}
          onBlur={commitTypedDate}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitTypedDate()
              setOpen(false)
            }
            if (e.key === 'Escape') {
              setTyped(formatInput(value))
              setOpen(false)
            }
          }}
          placeholder={placeholder}
          className={`pr-10 disabled:cursor-not-allowed disabled:opacity-50 ${cls}`}
        />
        <button
          type="button"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => !disabled && setOpen((o) => !o)}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Abrir calendário"
        >
          <svg
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
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 w-72 max-w-[calc(100vw-2rem)] select-none rounded-xl border border-zinc-100 bg-white shadow-2xl">
          <div className="flex items-center justify-between px-3 pt-3 pb-2">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={prev}
              className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 transition"
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <span className="text-xs font-semibold text-zinc-800 tracking-wide">
              {MONTHS_PT[vm]} {vy}
            </span>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={next}
              className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 transition"
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 px-2 pb-1">
            {WEEK_PT.map((w) => (
              <span
                key={w}
                className="flex h-6 items-center justify-center text-[10px] font-medium text-zinc-400"
              >
                {w}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-0.5 px-2 pb-2">
            {grid.map(({ d, cur }) => {
              const iso = toISO(d)
              const isSelected = iso === value
              const isToday = iso === todayISO

              return (
                <button
                  key={iso}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { onChange(iso); setTyped(formatInput(iso)); setOpen(false) }}
                  className={[
                    'flex h-8 w-8 mx-auto items-center justify-center rounded-full text-xs transition',
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

          {value && (
            <div className="border-t border-zinc-100 px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-zinc-500">{formatLongPT(value)}</span>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange(''); setTyped(''); setOpen(false) }}
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
