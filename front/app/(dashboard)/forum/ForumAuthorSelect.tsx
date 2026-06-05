'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Author = { id: string; name: string }

type Props = {
  value?: string
  authors: Author[]
  category?: string
  sort?: string
  q?: string
}

export default function ForumAuthorSelect({ value, authors, category, sort, q }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = authors.find((a) => a.id === value)
  const filtered = authors.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
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

  function pick(authorId: string) {
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (sort && sort !== 'recentes') params.set('sort', sort)
    if (q?.trim()) params.set('q', q.trim())
    if (authorId) params.set('author', authorId)
    const qs = params.toString()
    router.push(qs ? `/forum?${qs}` : '/forum')
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={ref} className="relative w-full sm:w-48">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white pl-3 pr-2.5 py-2 text-sm text-left outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition"
      >
        <span className={selected ? 'text-zinc-700 truncate' : 'text-zinc-400'}>
          {selected ? selected.name : 'Todos os autores'}
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
              onClick={() => pick('')}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                !value ? 'text-zinc-900 font-medium bg-zinc-50' : 'text-zinc-400 hover:bg-zinc-50'
              }`}
            >
              Todos os autores
            </button>
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-sm text-zinc-400 text-center">Nenhum resultado</p>
            ) : (
              filtered.map((author) => (
                <button
                  key={author.id}
                  type="button"
                  onClick={() => pick(author.id)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    author.id === value ? 'text-zinc-900 font-medium bg-zinc-50' : 'text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  {author.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
