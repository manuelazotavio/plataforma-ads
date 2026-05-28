'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  initialValue: string
  categoria?: string
  status?: string
}

export default function EventSearchInput({ initialValue, categoria, status }: Props) {
  const router = useRouter()
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  useEffect(() => {
    const next = value.trim()
    const current = initialValue.trim()
    if (next === current) return

    const t = setTimeout(() => {
      const params = new URLSearchParams()
      if (categoria) params.set('categoria', categoria)
      if (status) params.set('status', status)
      if (next) params.set('q', next)
      const qs = params.toString()
      router.replace(qs ? `/eventos?${qs}` : '/eventos')
    }, 350)

    return () => clearTimeout(t)
  }, [value, initialValue, categoria, status, router])

  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx={11} cy={11} r={8} />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar evento..."
        className="w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-9 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#2F9E41] focus:ring-2 focus:ring-[#2F9E41]/10"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue('')}
          aria-label="Limpar busca"
          className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400 transition hover:text-zinc-700"
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <line x1={18} y1={6} x2={6} y2={18} />
            <line x1={6} y1={6} x2={18} y2={18} />
          </svg>
        </button>
      )}
    </div>
  )
}
