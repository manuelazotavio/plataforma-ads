'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { getAuthUser } from '@/app/lib/auth'
import UserAvatar from '@/app/components/UserAvatar'

type Level = { id: number; name: string; min_xp: number; description: string | null }

type PublicHomeData = {
  id: string
  name: string
  firstName: string
  avatar_url: string | null
  semester: number | null
  role: string | null
  topicsCount: number
  projectsCount: number
  articlesCount: number
  commentsCount: number
  likesReceived: number
  xp: number
  level: Level | null
  nextLevel: Level | null
  levels: Level[]
  levelProgress: number
}

export function PublicHeaderAuth() {
  const [data, setData] = useState<PublicHomeData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadHomeData().then((value) => {
      setData(value)
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    function close(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  if (!loaded) return <div className="h-9 w-28 rounded-lg bg-zinc-100" />

  if (!data) {
    return (
      <>
        <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900">
          Entrar
        </Link>
        <Link href="/cadastro" className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90" style={{ backgroundColor: '#2F9E41' }}>
          Criar conta
        </Link>
      </>
    )
  }

  return (
    <div ref={menuRef} className="relative flex items-center gap-3 pl-4 border-l border-zinc-100">
      <div className="hidden sm:block text-right leading-tight">
        <p className="text-sm font-semibold text-zinc-900">{data.name}</p>
        <p className="mt-0.5 text-xs text-zinc-400">{profileLabel(data)}</p>
      </div>
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className="rounded-full ring-2 ring-zinc-100"
      >
        <UserAvatar src={data.avatar_url} name={data.name} className="h-9 w-9" />
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-zinc-200 bg-white shadow-lg py-1 z-50">
          <div className="py-1">
            <Link href="/perfil" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition">
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 shrink-0"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx={12} cy={7} r={4}/></svg>
              Meu perfil
            </Link>
            <Link href="/meus-projetos" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition">
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 shrink-0"><rect x={3} y={3} width={7} height={7}/><rect x={14} y={3} width={7} height={7}/><rect x={14} y={14} width={7} height={7}/><rect x={3} y={14} width={7} height={7}/></svg>
              Meus projetos
            </Link>
            <Link href="/meus-artigos" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition">
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Meus artigos
            </Link>
            {data.role === 'admin' && (
              <Link href="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition">
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 shrink-0"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                Painel Admin
              </Link>
            )}
          </div>
          <div className="border-t border-zinc-100 py-1">
            <button
              type="button"
              onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
            >
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1={21} y1={12} x2={9} y2={12}/></svg>
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function PublicWelcomeCard() {
  const [data, setData] = useState<PublicHomeData | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    loadHomeData().then((value) => {
      setData(value)
      setLoaded(true)
    })
  }, [])

  const loggedIn = loaded && data

  return (
    <div className="dashboard-welcome-card rounded-2xl border border-zinc-100 px-6 py-7 sm:px-10 sm:py-8">
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-zinc-900">
        {loggedIn ? `Bem-vindo(a) de volta, ${data.firstName}!` : 'Bem-vindo(a) ao ADS Comunica!'}
      </h1>
      <p className="mb-8 max-w-xl text-base text-zinc-500">
        {loggedIn
          ? 'Há novos artigos e projetos para visualizar.'
          : 'Veja projetos, acompanhe discussões e conheça as oportunidades da comunidade de ADS.'}
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href={loggedIn ? '/projetos/novo' : '/cadastro'}
          className="flex items-center gap-2 rounded-lg px-6 py-3 text-base font-semibold text-white shadow-sm transition"
          style={{ backgroundColor: '#2F9E41' }}
        >
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          Novo projeto
        </Link>
        <Link
          href={loggedIn ? '/forum/novo' : '/login'}
          className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-6 py-3 text-base font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
        >
          <MessageIcon size={16} />
          Criar tópico
        </Link>
      </div>
    </div>
  )
}

export function PublicProfileCard() {
  const [data, setData] = useState<PublicHomeData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [levelsOpen, setLevelsOpen] = useState(false)

  useEffect(() => {
    loadHomeData().then((value) => {
      setData(value)
      setLoaded(true)
    })
  }, [])

  if (!loaded) {
    return <div className="h-48 rounded-2xl border border-zinc-200 bg-white p-5" />
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h3 className="mb-4 text-base font-semibold text-zinc-900">Seu Perfil</h3>
        <div className="mb-5 flex items-center gap-4">
          <ProgressRing value={0} />
          <div>
            <p className="text-sm font-semibold text-zinc-900">Visitante</p>
            <p className="mt-0.5 text-xs text-zinc-400">Entre para publicar e comentar</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4">
          <Link href="/login" className="rounded-lg border border-zinc-200 px-3 py-2 text-center text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50">Entrar</Link>
          <Link href="/cadastro" className="rounded-lg px-3 py-2 text-center text-xs font-semibold text-white transition hover:opacity-90" style={{ backgroundColor: '#2F9E41' }}>Criar conta</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h3 className="mb-4 text-base font-semibold text-zinc-900">Seu perfil</h3>
      <div className="mb-5 flex items-center gap-4">
        <ProgressRing value={data.levelProgress} />
        <div>
          <p className="text-sm font-semibold text-zinc-900">{data.level ? data.level.name : 'Sem nível'}</p>
          {data.level?.description && (
            <p className="mt-0.5 text-xs leading-snug text-zinc-500">{data.level.description}</p>
          )}
          <p className="mt-0.5 text-xs text-zinc-400">
            {data.nextLevel
              ? `${Math.max(0, data.nextLevel.min_xp - data.xp)} XP para ${data.nextLevel.name}`
              : `${data.xp} XP total`}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4">
        <Metric label="XP total" value={data.xp} />
        <Metric label="Projetos criados" value={data.projectsCount} />
        <Metric label="Artigos publicados" value={data.articlesCount} />
        <Metric label="Tópicos no fórum" value={data.topicsCount} />
        <button
          type="button"
          onClick={() => setLevelsOpen(true)}
          className="mt-1 rounded-lg border border-zinc-200 px-3 py-2 text-center text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
        >
          Ver detalhes dos níveis
        </button>
      </div>
      {levelsOpen && (
        <LevelsModal
          levels={data.levels}
          currentLevelId={data.level?.id ?? null}
          onClose={() => setLevelsOpen(false)}
        />
      )}
    </div>
  )
}

async function loadHomeData(): Promise<PublicHomeData | null> {
  const user = await getAuthUser()
  if (!user) return null

  const [
    { data: profile },
    { count: topicsCount },
    { count: projectsCount },
    { count: articlesCount },
    { count: projCommentsCount },
    { count: artCommentsCount },
    { data: ownProjects },
    { data: ownArticles },
    { data: levelsData },
  ] = await Promise.all([
    supabase.from('users').select('name, avatar_url, semester, role').eq('id', user.id).single(),
    supabase.from('forum_topics').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('articles').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'publicado'),
    supabase.from('project_comments').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('article_comments').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('projects').select('like_count').eq('user_id', user.id),
    supabase.from('articles').select('like_count').eq('user_id', user.id),
    supabase.from('levels').select('id, name, min_xp, description').order('min_xp', { ascending: true }),
  ])

  if (!profile) return null

  const likesReceived =
    (ownProjects ?? []).reduce((sum, project) => sum + (project.like_count ?? 0), 0) +
    (ownArticles ?? []).reduce((sum, article) => sum + (article.like_count ?? 0), 0)

  const commentsCount = (projCommentsCount ?? 0) + (artCommentsCount ?? 0)
  const xp =
    (projectsCount ?? 0) * 50 +
    (articlesCount ?? 0) * 40 +
    (topicsCount ?? 0) * 20 +
    commentsCount * 10 +
    likesReceived * 5

  const levels = (levelsData ?? []) as Level[]
  const level = [...levels].reverse().find((item) => xp >= item.min_xp) ?? levels[0] ?? null
  const currentIndex = level ? levels.findIndex((item) => item.id === level.id) : -1
  const nextLevel = currentIndex >= 0 && currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null
  const levelProgress = nextLevel && level
    ? Math.min(100, Math.round(((xp - level.min_xp) / (nextLevel.min_xp - level.min_xp)) * 100))
    : 100

  return {
    id: user.id,
    name: profile.name,
    firstName: profile.name?.split(' ')[0] ?? 'Aluno',
    avatar_url: profile.avatar_url,
    semester: profile.semester,
    role: profile.role,
    topicsCount: topicsCount ?? 0,
    projectsCount: projectsCount ?? 0,
    articlesCount: articlesCount ?? 0,
    commentsCount,
    likesReceived,
    xp,
    level,
    nextLevel,
    levels,
    levelProgress,
  }
}

function profileLabel(profile: Pick<PublicHomeData, 'role' | 'semester'>) {
  if (profile.role === 'professor') return 'Professor'
  if (profile.role === 'admin') return 'Administrador'
  if (profile.role === 'egresso') return 'Egresso'
  if (profile.semester) return `${profile.semester}º Semestre`
  return 'Aluno'
}

function LevelsModal({
  levels,
  currentLevelId,
  onClose,
}: {
  levels: Level[]
  currentLevelId: number | null
  onClose: () => void
}) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="levels-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 id="levels-modal-title" className="text-base font-semibold text-zinc-900">
              Níveis de XP
            </h3>
            <p className="mt-0.5 text-xs text-zinc-400">Veja o que cada nível representa.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="flex max-h-[65vh] flex-col gap-2 overflow-y-auto pr-1">
          {levels.length > 0 ? (
            levels.map((level, index) => {
              const nextLevel = levels[index + 1]
              const range = nextLevel ? `${level.min_xp}-${nextLevel.min_xp - 1} XP` : `${level.min_xp}+ XP`
              const isCurrent = currentLevelId === level.id

              return (
                <div
                  key={level.id}
                  className={
                    'rounded-xl border px-3 py-3 ' +
                    (isCurrent ? 'border-[#2F9E41] bg-green-50' : 'border-zinc-100 bg-white')
                  }
                >
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-zinc-900">{level.name}</p>
                    <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-600">
                      {range}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-zinc-500">
                    {level.description ?? 'Descrição ainda não cadastrada para este nível.'}
                  </p>
                  {isCurrent && (
                    <p className="mt-2 text-[11px] font-semibold text-[#2F9E41]">Seu nível atual</p>
                  )}
                </div>
              )
            })
          ) : (
            <div className="rounded-xl border border-zinc-100 px-3 py-4 text-sm text-zinc-500">
              Nenhum nível cadastrado ainda.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ProgressRing({ value }: { value: number }) {
  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg viewBox="0 0 56 56" className="h-full w-full -rotate-90">
        <circle cx={28} cy={28} r={22} fill="none" stroke="#f0fdf4" strokeWidth={6} />
        <circle
          cx={28}
          cy={28}
          r={22}
          fill="none"
          stroke="#16a34a"
          strokeWidth={6}
          strokeDasharray={`${2 * Math.PI * 22}`}
          strokeDashoffset={`${2 * Math.PI * 22 * (1 - value / 100)}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-green-700">
        {value}%
      </span>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-xs font-semibold text-zinc-900">{value}</span>
    </div>
  )
}

function MessageIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}
