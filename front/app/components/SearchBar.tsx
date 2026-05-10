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
  return (
    page.title.toLowerCase().includes(lower) ||
    page.keywords.toLowerCase().includes(lower)
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
      void Promise.resolve().then(() => {
        setResults([])
        setOpen(false)
      })
      return
    }

    void Promise.resolve().then(() => setLoading(true))
    const timer = setTimeout(async () => {
      const like = `%${q}%`

      const [{ data: projects }, { data: articles }, { data: topics }, { data: users }] =
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
          supabase
            .from('users')
            .select('id, name, role')
            .ilike('name', like)
            .limit(5),
        ])

      const pages = STATIC_PAGES
        .filter((p) => matchesQuery(p, q))
        .slice(0, 3)
        .map((p) => ({
          id: p.url,
          title: p.title,
          type: 'page' as const,
          subtitle: p.subtitle,
          url: p.url,
        }))

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
        ...(users ?? []).map((u) => ({
          id: u.id,
          title: u.name,
          type: 'user' as const,
          subtitle: u.role ? `Perfil ${u.role}` : 'Perfil',
        })),
        ...pages,
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
      r.url                        ? r.url              :
      r.type === 'project'         ? `/projetos/${r.id}` :
      r.type === 'article'         ? `/artigos/${r.id}`  :
      r.type === 'user'            ? `/usuarios/${r.id}` :
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
    <div ref={ref} className="relative block min-w-0 flex-1 md:w-[min(42vw,28rem)] md:max-w-md md:flex-none">
      <svg
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2F9E41]"
        width={16} height={16} viewBox="0 0 24 24" fill="none"
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
        placeholder="Buscar projetos, usuarios, tópicos..."
        autoComplete="off"
        className="h-10 w-full rounded-xl border border-zinc-300 bg-white pl-10 pr-4 text-sm font-medium text-zinc-800 shadow-sm outline-none transition placeholder:text-zinc-500 hover:border-zinc-400 focus:border-[#2F9E41] focus:ring-2 focus:ring-[#2F9E41]/15"
      />

      {open && (
        <div className="fixed left-4 right-4 top-16 z-50 mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl md:absolute md:left-0 md:right-auto md:top-full md:w-full md:min-w-96">
          {loading ? (
            <div className="px-4 py-4 text-sm text-zinc-400">Buscando…</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-5 text-sm text-zinc-400 text-center">
              Nenhum resultado para <span className="font-medium text-zinc-600">{query}</span>
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
