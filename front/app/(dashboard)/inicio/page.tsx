'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

type Project = {
  id: string
  title: string
  description: string | null
  updated_at: string
  like_count: number
  project_tags: { tag_name: string }[]
  users: { name: string } | null
}

type Topic = {
  id: string
  title: string
  created_at: string
  replies_count: number
  users: { name: string } | null
  forum_categories: { name: string } | null
}

type UserStats = {
  firstName: string
  topicsCount: number
  projectsCount: number
}

type Contributor = {
  id: string
  name: string
  avatar_url: string | null
  semester: number | null
  totalLikes: number
}

export default function InicioPage() {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [featuredProjects, setFeaturedProjects] = useState<Project[]>([])
  const [recentTopics, setRecentTopics] = useState<Topic[]>([])
  const [popularTags, setPopularTags] = useState<string[]>([])
  const [topContributors, setTopContributors] = useState<Contributor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [
        { data: profile },
        { count: topicsCount },
        { count: projectsCount },
        { data: projects },
        { data: topics },
        { data: tags },
        { data: topProjects },
      ] = await Promise.all([
        supabase.from('users').select('name').eq('id', user.id).single(),
        supabase.from('forum_topics').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase
          .from('projects')
          .select('id, title, description, updated_at, like_count, project_tags(tag_name), users(name)')
          .order('like_count', { ascending: false })
          .limit(2),
        supabase
          .from('forum_topics')
          .select('id, title, created_at, replies_count, users(name), forum_categories(name)')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('project_tags').select('tag_name').limit(50),
        supabase
          .from('projects')
          .select('like_count, users(id, name, avatar_url, semester)')
          .order('like_count', { ascending: false })
          .limit(50),
      ])

      const firstName = profile?.name?.split(' ')[0] ?? 'Aluno'
      setStats({ firstName, topicsCount: topicsCount ?? 0, projectsCount: projectsCount ?? 0 })
      setFeaturedProjects((projects ?? []) as Project[])
      setRecentTopics((topics ?? []) as Topic[])

      const tagSet = new Set<string>()
      tags?.forEach((t) => tagSet.add(t.tag_name))
      setPopularTags(Array.from(tagSet).slice(0, 6))

    
      const likesMap = new Map<string, Contributor>()
      for (const p of topProjects ?? []) {
        const raw = p.users
        const u = (Array.isArray(raw) ? raw[0] : raw) as { id: string; name: string; avatar_url: string | null; semester: number | null } | null
        if (!u) continue
        const prev = likesMap.get(u.id)
        likesMap.set(u.id, {
          id: u.id,
          name: u.name,
          avatar_url: u.avatar_url,
          semester: u.semester,
          totalLikes: (prev?.totalLikes ?? 0) + (p.like_count ?? 0),
        })
      }
      const sorted = Array.from(likesMap.values()).sort((a, b) => b.totalLikes - a.totalLikes).slice(0, 3)
      setTopContributors(sorted)

      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="p-6 flex flex-col gap-6">
        <div className="h-36 rounded-2xl bg-zinc-100 animate-pulse" />
        <div className="h-48 rounded-2xl bg-zinc-100 animate-pulse" />
        <div className="h-64 rounded-2xl bg-zinc-100 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="px-8 py-8 grid grid-cols-[minmax(0,750px)_290px_300px] gap-7 items-start">

      <div className="flex flex-col gap-7 min-w-0">

      
        <div
          className="rounded-2xl px-10 py-8 border border-zinc-100"
          style={{ background: 'linear-gradient(120deg, #f0fdf4 0%, #ffffff 55%, #fdf2f8 100%)' }}
        >
          <h1 className="text-3xl font-bold text-zinc-900 mb-3 tracking-tight">
            Bem-vindo(a) de volta, {stats?.firstName}!
          </h1>
          <p className="text-base text-zinc-500 mb-8">
            Há novos artigos e projetos para visualizar.
          </p>
          <div className="flex gap-3">
            <Link
              href="/projetos/novo"
              className="flex items-center gap-2 rounded-lg px-6 py-3 text-base font-semibold text-white transition shadow-sm"
              style={{ backgroundColor: '#0B7A3B' }}
            >
              + Novo Projeto
            </Link>
            <Link
              href="/forum/novo"
              className="flex items-center gap-2 rounded-lg bg-white border border-zinc-200 px-6 py-3 text-base font-semibold text-zinc-700 hover:bg-zinc-50 transition shadow-sm"
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Criar Tópico
            </Link>
          </div>
        </div>

        
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
              <ProjectsIcon />
              Projetos em destaque
            </h2>
            <Link href="/projetos" className="text-sm text-green-600 hover:text-green-700 font-medium transition">
              Ver todos →
            </Link>
          </div>

          {featuredProjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 p-10 text-center">
              <p className="text-sm text-zinc-400">Nenhum projeto cadastrado ainda.</p>
              <Link href="/projetos/novo" className="mt-3 inline-block text-sm text-green-600 font-medium hover:underline">
                Criar o primeiro projeto →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5">
              {featuredProjects.map((project) => {
                const tags = project.project_tags as { tag_name: string }[]
                const author = project.users as { name: string } | null
                return (
                  <Link
                    key={project.id}
                    href={`/projetos/${project.id}`}
                    className="rounded-2xl border border-zinc-200 bg-white p-7 flex flex-col gap-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col gap-1.5">
                      <h3 className="text-lg font-bold text-zinc-900 leading-snug">{project.title}</h3>
                      {author && (
                        <p className="text-sm text-zinc-400">
                          Por {author.name} • Atualizado {relativeTime(project.updated_at)}
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500 line-clamp-4 flex-1 leading-relaxed">{project.description}</p>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-auto">
                        {tags.slice(0, 3).map((t) => (
                          <span key={t.tag_name} className="rounded-full border border-zinc-200 px-3 py-1 text-sm text-zinc-600 bg-white">
                            {t.tag_name}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </section>

       
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
              <TopicsIcon />
              Discussões Recentes
            </h2>
            <Link href="/forum" className="text-sm text-green-600 hover:text-green-700 font-medium transition">
              Ver todas →
            </Link>
          </div>

          {recentTopics.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center">
              <p className="text-sm text-zinc-400">Nenhum tópico no fórum ainda.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {recentTopics.map((topic) => {
                const author = topic.users as { name: string } | null
                const category = topic.forum_categories as { name: string } | null
                return (
                  <Link
                    key={topic.id}
                    href={`/forum/${topic.id}`}
                    className="rounded-2xl border border-zinc-200 bg-white px-6 py-5 flex items-start justify-between gap-4 hover:border-zinc-300 transition"
                  >
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <p className="text-base font-semibold text-zinc-900 truncate">{topic.title}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {category && (
                          <span className="text-xs text-green-700 bg-green-50 rounded px-2 py-0.5 font-medium">
                            {category.name}
                          </span>
                        )}
                        <span className="text-sm text-zinc-400">
                          Criado por {author?.name ?? 'Aluno'} · {formatDate(topic.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-zinc-400 shrink-0 pt-0.5">
                      <ReplyIcon />
                      {topic.replies_count}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </div>

     
      <div className="flex flex-col gap-4">

        
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h3 className="text-base font-semibold text-zinc-900 mb-4">Seu Perfil</h3>

          <div className="flex items-center gap-4 mb-5">
            <div className="relative w-14 h-14 shrink-0">
              <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
                <circle cx={28} cy={28} r={22} fill="none" stroke="#f0fdf4" strokeWidth={6} />
                <circle
                  cx={28} cy={28} r={22}
                  fill="none" stroke="#16a34a" strokeWidth={6}
                  strokeDasharray={`${2 * Math.PI * 22}`}
                  strokeDashoffset={`${2 * Math.PI * 22 * 0.25}`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-green-700">
                75%
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">Nível 4: Desbravador</p>
              <p className="text-xs text-zinc-400 mt-0.5">250 XP para o próximo nível</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Tópicos criados</span>
              <span className="text-xs font-semibold text-zinc-900">{stats?.topicsCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Projetos criados</span>
              <span className="text-xs font-semibold text-zinc-900">{stats?.projectsCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Projetos ativos</span>
              <span className="text-xs font-semibold text-zinc-900">—</span>
            </div>
          </div>
        </div>

        
        {topContributors.length > 0 && <TopContributorsCard contributors={topContributors} />}

        {popularTags.length > 0 && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h3 className="text-base font-semibold text-zinc-900 mb-3">Tags Populares</h3>
            <div className="flex flex-wrap gap-2">
              {popularTags.map((tag) => (
                <Link
                  key={tag}
                  href={`/projetos?tag=${encodeURIComponent(tag)}`}
                  className="rounded-full bg-zinc-100 hover:bg-zinc-200 px-3 py-1 text-xs text-zinc-600 font-medium transition"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

     
      <div className="flex flex-col gap-4">
        <CalendarCard />
      </div>

    </div>
  )
}

function TopContributorsCard({ contributors }: { contributors: Contributor[] }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h3 className="text-base font-semibold text-zinc-900 mb-4 flex items-center gap-2">
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx={12} cy={8} r={6} />
          <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
        </svg>
        Top Contribuidores
      </h3>
      <div className="flex flex-col gap-3">
        {contributors.map((c, i) => (
          <div key={c.id} className="flex items-center gap-3">
            <span className="text-xs font-bold text-zinc-300 w-4 shrink-0">{i + 1}</span>
            <div className="w-8 h-8 rounded-full bg-zinc-200 shrink-0 overflow-hidden">
              {c.avatar_url ? (
                <img src={c.avatar_url} alt={c.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs font-semibold">
                  {c.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-900 truncate">{c.name}</p>
              <p className="text-xs text-zinc-400">{c.semester ? `${c.semester}º Semestre` : 'Aluno'}</p>
            </div>
            <span className="text-xs font-bold shrink-0" style={{ color: '#0B7A3B' }}>
              {c.totalLikes > 0 ? `${c.totalLikes} XP` : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DAY_LABELS  = ['D','S','T','Q','Q','S','S']

function CalendarCard() {
  const now    = new Date()
  const year   = now.getFullYear()
  const month  = now.getMonth()
  const today  = now.getDate()

  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth  = new Date(year, month + 1, 0).getDate()

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h3 className="text-base font-semibold text-zinc-900 mb-4">Calendário de eventos</h3>
      <p className="text-base font-bold text-zinc-900 mb-3">{MONTH_NAMES[month]}</p>

      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="text-center text-[11px] text-zinc-400 font-medium pb-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => (
          <div key={i} className="flex items-center justify-center h-7">
            {day !== null && (
              <span
                className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium ${
                  day === today ? 'text-white font-bold' : 'text-zinc-700'
                }`}
                style={day === today ? { backgroundColor: '#0B7A3B' } : undefined}
              >
                {day}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-green-400 shrink-0" />
        <span className="text-xs text-zinc-600">Hackathon 2026</span>
      </div>
    </div>
  )
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const h = Math.floor(ms / 36e5)
  if (h < 1) return 'há menos de 1h'
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'há 1 dia' : `há ${d} dias`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
}

function ProjectsIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x={3} y={3} width={7} height={7} /><rect x={14} y={3} width={7} height={7} />
      <rect x={14} y={14} width={7} height={7} /><rect x={3} y={14} width={7} height={7} />
    </svg>
  )
}

function TopicsIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function ReplyIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}
