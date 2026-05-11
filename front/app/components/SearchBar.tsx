'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

type ResultType = 'project' | 'article' | 'forum_topic' | 'user' | 'page'

type Result = {
  id: string
  title: string
  type: ResultType
  subtitle?: string
  url?: string
}

const TYPE_LABEL: Record<ResultType, string> = {
  project:     'Projeto',
  article:     'Artigo',
  forum_topic: 'Fórum',
  user:        'Usuario',
  page:        'Página',
}

function TypeBadge({ type }: { type: ResultType }) {
  const colors: Record<ResultType, string> = {
    project:     'bg-blue-50 text-blue-600',
    article:     'bg-amber-50 text-amber-600',
    forum_topic: 'bg-purple-50 text-purple-600',
    user:        'bg-emerald-50 text-emerald-600',
    page:        'bg-zinc-100 text-zinc-600',
  }
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${colors[type]}`}>
      {TYPE_LABEL[type]}
    </span>
  )
}

const STATIC_PAGES: { title: string; subtitle: string; url: string; keywords: string }[] = [
  { title: 'Sobre o curso', subtitle: 'O Curso', url: '/curso#sobre-o-curso', keywords: 'ads análise desenvolvimento sistemas tecnólogo duração modalidade' },
  { title: 'Matriz curricular', subtitle: 'O Curso', url: '/curso#matriz-curricular', keywords: 'disciplinas semestres grade curricular' },
  { title: 'Professores', subtitle: 'O Curso', url: '/curso#professores', keywords: 'corpo docente professores coordenação' },
  { title: 'Infraestrutura', subtitle: 'O Curso', url: '/curso#infraestrutura', keywords: 'laboratórios salas equipamentos' },
  { title: 'Passe escolar', subtitle: 'Orientações Acadêmicas', url: '/area-aluno#orientacoes-academicas', keywords: 'passe escolar transporte solicitação vale ônibus' },
  { title: 'Requerimentos no SUAP', subtitle: 'Orientações Acadêmicas', url: '/area-aluno#orientacoes-academicas', keywords: 'suap requerimento solicitação acadêmica protocolo' },
  { title: 'Estágio', subtitle: 'Orientações Acadêmicas', url: '/area-aluno#orientacoes-academicas', keywords: 'estágio empresa supervisor documentos' },
  { title: 'Iniciação científica', subtitle: 'Orientações Acadêmicas', url: '/area-aluno#orientacoes-academicas', keywords: 'iniciação científica pesquisa edital orientador bolsa' },
  { title: 'TCC', subtitle: 'Orientações Acadêmicas', url: '/area-aluno#orientacoes-academicas', keywords: 'tcc trabalho conclusão monografia defesa' },
  { title: 'Processos acadêmicos', subtitle: 'Orientações Acadêmicas', url: '/area-aluno#orientacoes-academicas', keywords: 'processo matrícula trancamento frequência setor' },
  { title: 'Materiais acadêmicos', subtitle: 'Área do Aluno', url: '/area-aluno#materiais', keywords: 'biblioteca modelos templates relatório trabalho' },
  { title: 'Links úteis', subtitle: 'Área do Aluno', url: '/area-aluno#links-uteis', keywords: 'suap moodle portal links acesso sistema' },
]

function matchesQuery(page: typeof STATIC_PAGES[number], q: string) {
  const lower = q.toLowerCase()
  return page.title.toLowerCase().includes(lower) || page.keywords.toLowerCase().includes(lower)
}

function SearchIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <circle cx={11} cy={11} r={8} />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

export default function SearchBar() {
  const router = useRouter()
  const desktopRef = useRef<HTMLDivElement>(null)
  const mobileRef = useRef<HTMLDivElement>(null)
  const desktopInputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(-1)
  const [mobileExpanded, setMobileExpanded] = useState(false)

  useEffect(() => {
    if (mobileExpanded) {
      setTimeout(() => mobileInputRef.current?.focus(), 50)
    }
  }, [mobileExpanded])

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
      const [{ data: projects }, { data: articles }, { data: topics }, { data: users }] =
        await Promise.all([
          supabase.from('projects').select('id, title, description').ilike('title', like).limit(5),
          supabase.from('articles').select('id, title, summary').eq('status', 'publicado').ilike('title', like).limit(5),
          supabase.from('forum_topics').select('id, title').ilike('title', like).limit(5),
          supabase.from('users').select('id, name, role').ilike('name', like).limit(5),
        ])

      const pages = STATIC_PAGES
        .filter((p) => matchesQuery(p, q))
        .slice(0, 3)
        .map((p) => ({ id: p.url, title: p.title, type: 'page' as const, subtitle: p.subtitle, url: p.url }))

      const all: Result[] = [
        ...(projects ?? []).map((p) => ({ id: p.id, title: p.title, type: 'project' as const, subtitle: p.description?.slice(0, 60) ?? undefined })),
        ...(articles ?? []).map((a) => ({ id: a.id, title: a.title, type: 'article' as const, subtitle: a.summary?.slice(0, 60) ?? undefined })),
        ...(topics ?? []).map((t) => ({ id: t.id, title: t.title, type: 'forum_topic' as const })),
        ...(users ?? []).map((u) => ({ id: u.id, title: u.name, type: 'user' as const, subtitle: u.role ? `Perfil ${u.role}` : 'Perfil' })),
        ...pages,
      ]

      setResults(all)
      setSelected(-1)
      setOpen(true)
      setLoading(false)
    }, 280)

    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    function close(e: MouseEvent) {
      const target = e.target as Node
      const outsideDesktop = !desktopRef.current?.contains(target)
      const outsideMobile = !mobileRef.current?.contains(target)
      if (outsideDesktop && outsideMobile) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  function navigateTo(r: Result) {
    setQuery('')
    setOpen(false)
    setMobileExpanded(false)
    const url =
      r.url                    ? r.url              :
      r.type === 'project'     ? `/projetos/${r.id}` :
      r.type === 'article'     ? `/artigos/${r.id}`  :
      r.type === 'user'        ? `/usuarios/${r.id}` :
                                 `/forum/${r.id}`
    router.push(url)
  }

  function closeMobile() {
    setMobileExpanded(false)
    setQuery('')
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
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
      setMobileExpanded(false)
    }
  }

  function ResultsList() {
    if (!open) return null
    return (
      <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl min-w-72">
        {loading ? (
          <div className="px-4 py-4 text-sm text-zinc-400">Buscando…</div>
        ) : results.length === 0 ? (
          <div className="px-4 py-5 text-center text-sm text-zinc-400">
            Nenhum resultado para <span className="font-medium text-zinc-600">{query}</span>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto py-1">
            {results.map((r, i) => (
              <button
                key={r.id}
                onMouseEnter={() => setSelected(i)}
                onClick={() => navigateTo(r)}
                className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition ${selected === i ? 'bg-zinc-50' : 'hover:bg-zinc-50'}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm leading-snug text-zinc-800">{r.title}</p>
                  {r.subtitle && <p className="mt-0.5 truncate text-xs text-zinc-400">{r.subtitle}</p>}
                </div>
                <TypeBadge type={r.type} />
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Mobile: ícone de busca */}
      <button
        type="button"
        onClick={() => setMobileExpanded(true)}
        aria-label="Buscar"
        className="md:hidden grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-500 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900"
      >
        <SearchIcon />
      </button>

      {/* Mobile: barra expandida (overlay no topo) */}
      {mobileExpanded && (
        <div className="fixed inset-x-0 top-0 z-60 flex h-16 items-center gap-3 border-b border-zinc-100 bg-white px-4 shadow-sm md:hidden">
          <div ref={mobileRef} className="relative flex-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2F9E41]">
              <SearchIcon />
            </span>
            <input
              ref={mobileInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => query.trim().length >= 2 && results.length > 0 && setOpen(true)}
              placeholder="Buscar projetos, usuários, tópicos..."
              autoComplete="off"
              className="h-10 w-full rounded-xl border border-zinc-300 bg-white pl-10 pr-4 text-sm font-medium text-zinc-800 shadow-sm outline-none transition placeholder:text-zinc-500 focus:border-[#2F9E41] focus:ring-2 focus:ring-[#2F9E41]/15"
            />
            <ResultsList />
          </div>
          <button
            type="button"
            onClick={closeMobile}
            className="shrink-0 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Desktop: barra sempre visível */}
      <div ref={desktopRef} className="relative hidden md:block w-[min(42vw,28rem)] max-w-md">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2F9E41]">
          <SearchIcon />
        </span>
        <input
          ref={desktopInputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim().length >= 2 && results.length > 0 && setOpen(true)}
          placeholder="Buscar projetos, usuários, tópicos..."
          autoComplete="off"
          className="h-10 w-full rounded-xl border border-zinc-300 bg-white pl-10 pr-4 text-sm font-medium text-zinc-800 shadow-sm outline-none transition placeholder:text-zinc-500 hover:border-zinc-400 focus:border-[#2F9E41] focus:ring-2 focus:ring-[#2F9E41]/15"
        />
        <ResultsList />
      </div>
    </>
  )
}
