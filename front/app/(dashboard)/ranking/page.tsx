export const dynamic = 'force-dynamic'

import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { computeXp, hasNonEmpty, countProfileLinks } from '@/app/lib/xp'
import UserAvatar from '@/app/components/UserAvatar'
import RankingFilters from './RankingFilters'
import XpInfoModal from './XpInfoModal'

type UserRow = {
  id: string
  name: string
  avatar_url: string | null
  bio: string | null
  github_url: string | null
  linkedin_url: string | null
  portfolio_url: string | null
  role: string | null
  created_at: string
}

type RankedUser = UserRow & { xp: number; position: number }

const ROLE_LABELS: Record<string, string> = {
  aluno:     'Aluno',
  professor: 'Professor',
  moderador: 'Moderador',
  admin:     'Admin',
  egresso:   'Ex-aluno',
}

const PODIUM: Record<number, { barBg: string; barHeight: string; avatarRing: string; labelColor: string }> = {
  1: { barBg: 'bg-amber-100',    barHeight: 'h-24', avatarRing: 'ring-2 ring-amber-300',    labelColor: 'text-amber-600' },
  2: { barBg: 'bg-zinc-100',     barHeight: 'h-16', avatarRing: 'ring-2 ring-zinc-300',     labelColor: 'text-zinc-500'  },
  3: { barBg: 'bg-amber-900/20', barHeight: 'h-12', avatarRing: 'ring-2 ring-amber-800/40', labelColor: 'text-amber-900' },
}

const MEDAL: Record<number, { emoji: string; bg: string; text: string; ring: string }> = {
  1: { emoji: '🥇', bg: 'bg-amber-50',  text: 'text-amber-600',  ring: 'ring-amber-300' },
  2: { emoji: '🥈', bg: 'bg-zinc-100',  text: 'text-zinc-500',   ring: 'ring-zinc-300' },
  3: { emoji: '🥉', bg: 'bg-orange-50', text: 'text-orange-500', ring: 'ring-orange-300' },
}

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; role?: string }>
}) {
  const { sort = 'xp', role = '' } = await searchParams

  const [
    { data: users },
    { data: projects },
    { data: articles },
    { data: topics },
    { data: projectComments },
    { data: articleComments },
  ] = await Promise.all([
    supabase
      .from('users')
      .select('id, name, avatar_url, bio, github_url, linkedin_url, portfolio_url, role, created_at'),
    supabase.from('projects').select('user_id, like_count'),
    supabase.from('articles').select('user_id, like_count').eq('status', 'publicado'),
    supabase.from('forum_topics').select('user_id'),
    supabase.from('project_comments').select('user_id'),
    supabase.from('article_comments').select('user_id'),
  ])

  // Agregar por usuário
  const projectsCount  = new Map<string, number>()
  const articlesCount  = new Map<string, number>()
  const topicsCount    = new Map<string, number>()
  const commentsCount  = new Map<string, number>()
  const likesReceived  = new Map<string, number>()

  for (const p of projects ?? []) {
    if (!p.user_id) continue
    projectsCount.set(p.user_id, (projectsCount.get(p.user_id) ?? 0) + 1)
    likesReceived.set(p.user_id, (likesReceived.get(p.user_id) ?? 0) + (p.like_count ?? 0))
  }
  for (const a of articles ?? []) {
    if (!a.user_id) continue
    articlesCount.set(a.user_id, (articlesCount.get(a.user_id) ?? 0) + 1)
    likesReceived.set(a.user_id, (likesReceived.get(a.user_id) ?? 0) + (a.like_count ?? 0))
  }
  for (const t of topics ?? [])         if (t.user_id) topicsCount.set(t.user_id,   (topicsCount.get(t.user_id)   ?? 0) + 1)
  for (const c of projectComments ?? []) if (c.user_id) commentsCount.set(c.user_id, (commentsCount.get(c.user_id) ?? 0) + 1)
  for (const c of articleComments ?? []) if (c.user_id) commentsCount.set(c.user_id, (commentsCount.get(c.user_id) ?? 0) + 1)

  // Calcular XP
  const ranked: RankedUser[] = (users ?? [] as UserRow[]).map((u) => ({
    ...(u as UserRow),
    xp: computeXp({
      projectsCount:  projectsCount.get(u.id)  ?? 0,
      articlesCount:  articlesCount.get(u.id)  ?? 0,
      topicsCount:    topicsCount.get(u.id)    ?? 0,
      commentsCount:  commentsCount.get(u.id)  ?? 0,
      likesReceived:  likesReceived.get(u.id)  ?? 0,
      hasAvatar: hasNonEmpty((u as UserRow).avatar_url),
      hasBio:    hasNonEmpty((u as UserRow).bio),
      linksCount: countProfileLinks(u as UserRow),
    }),
    position: 0,
  }))

  // Ordenar por XP para atribuir posições globais
  ranked.sort((a, b) => b.xp - a.xp)
  ranked.forEach((u, i) => { u.position = i + 1 })

  // Filtrar por role
  const filtered = role
    ? ranked.filter((u) => u.role === role)
    : ranked

  // Ordenar conforme filtro
  const sorted = sort === 'antigos'
    ? [...filtered].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    : filtered // já ordenado por XP

  const top3   = sorted.slice(0, 3)
  const rest   = sorted.slice(3)

  return (
    <div className="px-4 md:px-6 py-8 w-full max-w-2xl mx-auto">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Ranking</h1>
          <p className="text-sm text-zinc-500 mt-1">{sorted.length} participante{sorted.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-400">
          <span>Como funciona o XP?</span>
          <XpInfoModal />
        </div>
      </div>

      <RankingFilters />

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-16 text-center">
          <p className="text-sm text-zinc-400">Nenhum usuário encontrado.</p>
        </div>
      ) : (
        <>
          {/* Pódio top 3 */}
          {top3.length > 0 && sort !== 'antigos' && (
            <div className="mb-8 grid grid-cols-3 items-end gap-2">
              {([top3[1], top3[0], top3[2]] as (RankedUser | undefined)[]).map((u, idx) => {
                if (!u) return <div key={idx} />
                const pos = idx === 0 ? 2 : idx === 1 ? 1 : 3
                const p = PODIUM[pos]
                const isFirst = pos === 1
                return (
                  <Link
                    key={u.id}
                    href={`/usuarios/${u.id}`}
                    className="flex min-w-0 flex-col items-center gap-1 transition hover:opacity-80"
                  >
                    <div className={`relative shrink-0 rounded-full overflow-hidden ${p.avatarRing} ${isFirst ? 'h-12 w-12 sm:h-16 sm:w-16' : 'h-9 w-9 sm:h-12 sm:w-12'}`}>
                      {u.avatar_url ? (
                        <Image src={u.avatar_url} alt={u.name} fill className="object-cover" />
                      ) : (
                        <UserAvatar name={u.name} className="h-full w-full" sizes={isFirst ? '48px' : '36px'} />
                      )}
                    </div>
                    <p className="mt-1 w-full truncate px-1 text-center text-[10px] font-semibold leading-tight text-zinc-800 sm:text-xs">{u.name}</p>

                    <div className={`w-full rounded-t-xl ${p.barBg} ${p.barHeight} flex flex-col items-center justify-center gap-0.5 mt-1 px-1`}>
                      <span className={`text-xs font-bold ${p.labelColor}`}>{pos}º</span>
                      <span className="text-[10px] font-semibold text-zinc-400 truncate w-full text-center">{u.xp.toLocaleString('pt-BR')} XP</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Lista completa */}
          <div className="flex flex-col divide-y divide-zinc-100 rounded-2xl border border-zinc-100 overflow-hidden">
            {sorted.map((u, idx) => {
              const medal = MEDAL[u.position]
              const showMedal = sort !== 'antigos' && u.position <= 3
              return (
                <Link
                  key={u.id}
                  href={`/usuarios/${u.id}`}
                  className="flex items-center gap-4 px-4 py-3 bg-white hover:bg-zinc-50 transition"
                >
                  <span className={`w-7 shrink-0 text-center text-sm font-bold ${
                    sort !== 'antigos' && u.position === 1 ? 'text-amber-500' :
                    sort !== 'antigos' && u.position === 2 ? 'text-zinc-400' :
                    sort !== 'antigos' && u.position === 3 ? 'text-amber-900/60' :
                    'text-zinc-300'
                  }`}>
                    {sort === 'antigos' ? idx + 1 : u.position}º
                  </span>

                  <div className="relative h-9 w-9 shrink-0 rounded-full overflow-hidden">
                    {u.avatar_url ? (
                      <Image src={u.avatar_url} alt={u.name} fill className="object-cover" />
                    ) : (
                      <UserAvatar name={u.name} className="h-full w-full" sizes="36px" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-900 truncate">{u.name}</span>
                      {u.role && u.role !== 'aluno' && (
                        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      )}
                    </div>
                    {sort === 'antigos' && (
                      <p className="text-xs text-zinc-400">
                        Desde {new Date(u.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                      </p>
                    )}
                  </div>

                  <span className="shrink-0 text-sm font-black text-[#2F9E41]">
                    {u.xp.toLocaleString('pt-BR')} XP
                  </span>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
