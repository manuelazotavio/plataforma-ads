import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import ForumCategorySelect from './ForumCategorySelect'
import ForumSortToggle from './ForumSortToggle'

export const dynamic = 'force-dynamic'

export default async function ForumPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string }>
}) {
  const { category, sort: sortParam } = await searchParams
  const sort = sortParam === 'votados' ? 'votados' : 'recentes'

  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setUTCHours(0, 0, 0, 0)
  startOfWeek.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7)) // segunda-feira
  const weekAgo = startOfWeek.toISOString()

  const [{ data: categories }, { data: topics }, { data: weeklyVotes }] = await Promise.all([
    supabase.from('forum_categories').select('id, name').order('display_order'),
    supabase
      .from('forum_topics')
      .select('id, title, created_at, replies_count, views_count, user_id, is_closed, users(id, name), forum_categories(id, name)')
      .order('created_at', { ascending: false }),
    supabase.from('forum_topic_votes').select('topic_id').gte('created_at', weekAgo),
  ])

  // Votos desta semana (badge + ordenação "mais votados")
  const weeklyVoteMap = new Map<string, number>()
  for (const v of weeklyVotes ?? []) {
    weeklyVoteMap.set(v.topic_id, (weeklyVoteMap.get(v.topic_id) ?? 0) + 1)
  }
  const maxWeeklyVotes = Math.max(0, ...weeklyVoteMap.values())

  const base = category
    ? (topics ?? []).filter((t) => {
        const cat = t.forum_categories as unknown as { id: string } | null
        return cat?.id === category
      })
    : (topics ?? [])

  const filtered = [...base].sort((a, b) => {
    if (sort === 'votados') {
      const va = weeklyVoteMap.get(a.id) ?? 0
      const vb = weeklyVoteMap.get(b.id) ?? 0
      if (vb !== va) return vb - va
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <div className="px-4 md:px-6 py-8 w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Fórum</h1>
          <p className="text-sm text-zinc-500 mt-1">{filtered.length} tópico{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/forum/novo"
          className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ backgroundColor: '#2F9E41' }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          Novo tópico
        </Link>
      </div>

      
      <div className="mb-8 flex flex-wrap items-center gap-3">
        {(categories?.length ?? 0) > 0 && (
          <ForumCategorySelect value={category} sort={sort} categories={categories!} />
        )}
        <ForumSortToggle sort={sort} category={category} />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-16 text-center">
          <p className="text-sm text-zinc-400">Nenhum tópico ainda.</p>
          <Link href="/forum/novo" className="mt-3 inline-flex items-center gap-1 text-sm text-[#2F9E41] font-medium hover:opacity-70">
            Criar o primeiro
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100">
          {filtered.map((topic) => {
            const author = topic.users as unknown as { id: string; name: string } | null
            const cat = topic.forum_categories as unknown as { id: string; name: string } | null
            const isClosed = (topic as unknown as { is_closed: boolean }).is_closed
            const weekVotes = weeklyVoteMap.get(topic.id) ?? 0
            const isTopOfWeek = weekVotes > 0 && weekVotes === maxWeeklyVotes
            return (
              <div
                key={topic.id}
                className="flex items-start justify-between gap-8 py-5"
              >
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {cat && (
                      <span className="text-xs font-semibold text-[#2F9E41]">{cat.name}</span>
                    )}
                    {isTopOfWeek && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                        <svg width={9} height={9} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
                        Mais votado da semana
                      </span>
                    )}
                    {isClosed && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                        <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        Encerrado
                      </span>
                    )}
                  </div>
                  <Link href={`/forum/${topic.id}`} className="text-base font-black text-zinc-900 leading-tight hover:opacity-70 transition">
                    {topic.title}
                  </Link>
                  <p className="text-xs text-zinc-400">
                    {author ? (
                      <Link href={`/usuarios/${author.id}`} className="hover:text-[#2F9E41] transition">
                        {author.name}
                      </Link>
                    ) : 'Anonimo'} &bull; {new Date(topic.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <div className="flex items-center gap-5 shrink-0 pt-1 text-xs text-zinc-400">
                  <span>{topic.replies_count ?? 0} respostas</span>
                  <span>{topic.views_count ?? 0} views</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
