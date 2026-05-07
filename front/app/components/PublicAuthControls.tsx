'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

type Level = { id: number; name: string; min_xp: number }

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
  levelProgress: number
}

export function PublicHeaderAuth() {
  const [data, setData] = useState<PublicHomeData | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    loadHomeData().then((value) => {
      setData(value)
      setLoaded(true)
    })
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
    <div className="flex items-center gap-3 pl-4 border-l border-zinc-100">
      {data.role === 'admin' && (
        <Link href="/admin" className="hidden rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 sm:inline-flex">
          Painel Admin
        </Link>
      )}
      <div className="hidden sm:block text-right leading-tight">
        <p className="text-sm font-semibold text-zinc-900">{data.name}</p>
        <p className="mt-0.5 text-xs text-zinc-400">{profileLabel(data)}</p>
      </div>
      <Link href="/perfil" className="h-9 w-9 overflow-hidden rounded-full bg-zinc-200 ring-2 ring-zinc-100">
        {data.avatar_url ? (
          <Image src={data.avatar_url} alt={data.name} width={36} height={36} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-500">
            {data.name.charAt(0).toUpperCase()}
          </span>
        )}
      </Link>
    </div>
  )
}

export function PublicWelcomeCard({ studentsCount, projectsCount }: { studentsCount: number; projectsCount: number }) {
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
    <div className="rounded-2xl border border-zinc-100 px-10 py-8" style={{ background: 'linear-gradient(120deg, #f0fdf4 0%, #ffffff 55%, #fdf2f8 100%)' }}>
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
          Novo Projeto
        </Link>
        <Link
          href={loggedIn ? '/forum/novo' : '/login'}
          className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-6 py-3 text-base font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
        >
          <MessageIcon size={16} />
          Criar Tópico
        </Link>
      </div>
      <div className="mt-8 flex gap-8 border-t border-white/70 pt-5">
        <Stat label="Alunos" value={studentsCount} />
        <Stat label="Projetos" value={projectsCount} />
      </div>
    </div>
  )
}

export function PublicProfileCard() {
  const [data, setData] = useState<PublicHomeData | null>(null)
  const [loaded, setLoaded] = useState(false)

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
          <ProgressRing value={30} />
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
      <h3 className="mb-4 text-base font-semibold text-zinc-900">Seu Perfil</h3>
      <div className="mb-5 flex items-center gap-4">
        <ProgressRing value={data.levelProgress} />
        <div>
          <p className="text-sm font-semibold text-zinc-900">{data.level ? data.level.name : 'Sem nível'}</p>
          <p className="mt-0.5 text-xs text-zinc-400">
            {data.nextLevel
              ? `${Math.max(0, data.nextLevel.min_xp - data.xp)} XP para ${data.nextLevel.name}`
              : `${data.xp} XP total`}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4">
        {data.role === 'admin' && <Link href="/admin" className="rounded-lg border border-zinc-200 px-3 py-2 text-center text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50">Painel Admin</Link>}
        <Metric label="XP total" value={data.xp} />
        <Metric label="Projetos criados" value={data.projectsCount} />
        <Metric label="Artigos publicados" value={data.articlesCount} />
        <Metric label="Tópicos no fórum" value={data.topicsCount} />
      </div>
    </div>
  )
}

async function loadHomeData(): Promise<PublicHomeData | null> {
  const { data: { user } } = await supabase.auth.getUser()
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
    supabase.from('levels').select('id, name, min_xp').order('min_xp', { ascending: true }),
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-bold text-zinc-900">{value.toLocaleString('pt-BR')}</p>
      <p className="text-xs text-zinc-400">{label}</p>
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
