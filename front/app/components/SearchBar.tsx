'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

type ResultType = 'project' | 'article' | 'forum_topic'

type Result = {
  id: string
  title: string
  type: ResultType
  subtitle?: string
}

const TYPE_LABEL: Record<ResultType, string> = {
  project:     'Projeto',
  article:     'Artigo',
  forum_topic: 'Fórum',
}

function TypeBadge({ type }: { type: ResultType }) {
  const colors: Record<ResultType, string> = {
    project:     'bg-blue-50 text-blue-600',
    article:     'bg-amber-50 text-amber-600',
    forum_topic: 'bg-purple-50 text-purple-600',
  }
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${colors[type]}`}>
      {TYPE_LABEL[type]}
    </span>
  )
}

export default function SearchBar() {
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(-1)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setOpen(false)
      return
    }

    setLoading(true)
    const timer = setTimeout(async () => {
      const like = `%${q}%`

      const [{ data: projects }, { data: articles }, { data: topics }] =
        await Promise.all([
          supabase
            .from('projects')
            .select('id, title, description')
            .ilike('title', like)
            .limit(5),
          supabase
            .from('articles')
            .select('id, title, summary')
            .eq('status', 'publicado')
            .ilike('title', like)
            .limit(5),
          supabase
            .from('forum_topics')
            .select('id, title')
            .ilike('title', like)
            .limit(5),
        ])

      const all: Result[] = [
        ...(projects ?? []).map((p) => ({
          id: p.id,
          title: p.title,
          type: 'project' as const,
          subtitle: p.description?.slice(0, 60) ?? undefined,
        })),
        ...(articles ?? []).map((a) => ({
          id: a.id,
          title: a.title,
          type: 'article' as const,
          subtitle: a.summary?.slice(0, 60) ?? undefined,
        })),
        ...(topics ?? []).map((t) => ({
          id: t.id,
          title: t.title,
          type: 'forum_topic' as const,
        })),
      ]

      setResults(all)
      setSelected(-1)
      setOpen(true)
      setLoading(false)
    }, 280)

    return () => { clearTimeout(timer); }
  }, [query])

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  function navigateTo(r: Result) {
    setQuery('')
    setOpen(false)
    const url =
      r.type === 'project'     ? `/projetos/${r.id}` :
      r.type === 'article'     ? `/artigos/${r.id}`  :
                                  `/forum/${r.id}`
    router.push(url)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((s) => Math.min(s + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((s) => Math.max(s - 1, -1))
    } else if (e.key === 'Enter' && selected >= 0) {
      e.preventDefault()
      navigateTo(results[selected])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
      inputRef.current?.blur()
    }
  }

  return (
    <div ref={ref} className="hidden md:block relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
        width={14} height={14} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={2.5}
      >
        <circle cx={11} cy={11} r={8} />
        <path d="m21 21-4.35-4.35" />
      </svg>

      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => query.trim().length >= 2 && results.length > 0 && setOpen(true)}
        placeholder="Buscar projetos, tópicos..."
        autoComplete="off"
        className="rounded-full bg-zinc-100 pl-8 pr-4 py-2 text-sm text-zinc-700 outline-none focus:bg-zinc-200 transition w-64 placeholder:text-zinc-400"
      />

      {open && (
        <div className="absolute top-full left-0 mt-2 w-96 rounded-xl border border-zinc-200 bg-white shadow-xl z-50 overflow-hidden">
          {loading ? (
            <div className="px-4 py-4 text-sm text-zinc-400">Buscando…</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-5 text-sm text-zinc-400 text-center">
              Nenhum resultado para <span className="font-medium text-zinc-600">"{query}"</span>
            </div>
          ) : (
            <div className="py-1 max-h-80 overflow-y-auto">
              {results.map((r, i) => (
                <button
                  key={r.id}
                  onMouseEnter={() => setSelected(i)}
                  onClick={() => navigateTo(r)}
                  className={`w-full flex items-start gap-3 px-4 py-2.5 text-left transition ${
                    selected === i ? 'bg-zinc-50' : 'hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-800 truncate leading-snug">{r.title}</p>
                    {r.subtitle && (
                      <p className="text-xs text-zinc-400 truncate mt-0.5">{r.subtitle}</p>
                    )}
                  </div>
                  <TypeBadge type={r.type} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
