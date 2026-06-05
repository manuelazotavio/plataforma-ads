'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Select from '@/app/components/Select'

type Props = {
  tags: string[]
  authors: { id: string; name: string }[]
}

export default function ArticleFilters({ tags, authors }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`${pathname}?${params.toString()}`)
  }

  const hasFilters = searchParams.has('tag') || searchParams.has('autor')

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <Select
        value={searchParams.get('tag') ?? ''}
        onChange={(v) => update('tag', v)}
        placeholder="Todas as tags"
        options={tags.map((t) => ({ value: t, label: t }))}
        className="w-44"
      />
      <SearchableSelect
        value={searchParams.get('autor') ?? ''}
        onChange={(v) => update('autor', v)}
        placeholder="Todos os autores"
        options={authors.map((a) => ({ value: a.id, label: a.name }))}
        className="w-48"
      />
      {hasFilters && (
        <button
          onClick={() => router.push(pathname)}
          className="text-sm text-zinc-400 hover:text-zinc-700 transition px-1"
        >
          Limpar ×
        </button>
      )}
    </div>
  )
}

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.value === value)
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0)
    else setSearch('')
  }, [open])

  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white pl-3 pr-2.5 py-2 text-sm text-left outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition"
      >
        <span className={selected ? 'text-zinc-700 truncate' : 'text-zinc-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
        >
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full min-w-50 rounded-xl border border-zinc-200 bg-white shadow-lg overflow-hidden">
          <div className="p-2 border-b border-zinc-100">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar autor..."
                className="w-full rounded-lg bg-zinc-50 pl-7 pr-3 py-1.5 text-sm text-zinc-700 outline-none placeholder:text-zinc-400"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                !value ? 'text-zinc-900 font-medium bg-zinc-50' : 'text-zinc-400 hover:bg-zinc-50'
              }`}
            >
              {placeholder}
            </button>
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-sm text-zinc-400 text-center">Nenhum resultado</p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false); setSearch('') }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    o.value === value ? 'text-zinc-900 font-medium bg-zinc-50' : 'text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
