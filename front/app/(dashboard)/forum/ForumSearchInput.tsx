'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

type Props = {
  value?: string
  category?: string
  sort?: string
  author?: string
}

export default function ForumSearchInput({ value = '', category, sort, author }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState(value)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setQuery(value) }, [value])

  function navigate(q: string) {
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (sort && sort !== 'recentes') params.set('sort', sort)
    if (author?.trim()) params.set('author', author.trim())
    if (q.trim()) params.set('q', q.trim())
    const qs = params.toString()
    router.push(qs ? `/forum?${qs}` : '/forum')
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => navigate(q), 350)
  }

  return (
    <div className="relative flex-1 min-w-48">
      <svg
        width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
        className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
      >
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        type="search"
        value={query}
        onChange={onChange}
        placeholder="Buscar tópicos..."
        className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
      />
    </div>
  )
}
