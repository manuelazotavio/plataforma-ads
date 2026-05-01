import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

export default async function ForumPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams

  const [{ data: categories }, { data: topics }] = await Promise.all([
    supabase.from('forum_categories').select('id, name').order('display_order'),
    supabase
      .from('forum_topics')
      .select('id, title, created_at, replies_count, views_count, users(name), forum_categories(id, name)')
      .order('created_at', { ascending: false }),
  ])

  const filtered = category
    ? (topics ?? []).filter((t) => {
        const cat = t.forum_categories as { id: string } | null
        return cat?.id === category
      })
    : (topics ?? [])

  return (
    <div className="px-10 py-8 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Fórum</h1>
          <p className="text-sm text-zinc-500 mt-1">{filtered.length} tópico{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/forum/novo"
          className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ backgroundColor: '#0B7A3B' }}
        >
          + Novo tópico
        </Link>
      </div>

      
      {(categories?.length ?? 0) > 0 && (
        <div className="flex gap-2 mb-8 flex-wrap">
          <Link
            href="/forum"
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${!category ? 'text-white' : 'text-zinc-400 hover:text-zinc-700'}`}
            style={!category ? { backgroundColor: '#0B7A3B' } : undefined}
          >
            Todos
          </Link>
          {categories!.map((cat) => (
            <Link
              key={cat.id}
              href={`/forum?category=${cat.id}`}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${category === cat.id ? 'text-white' : 'text-zinc-400 hover:text-zinc-700'}`}
              style={category === cat.id ? { backgroundColor: '#0B7A3B' } : undefined}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-16 text-center">
          <p className="text-sm text-zinc-400">Nenhum tópico ainda.</p>
          <Link href="/forum/novo" className="mt-3 inline-flex items-center gap-1 text-sm text-[#0B7A3B] font-medium hover:opacity-70">
            Criar o primeiro
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100">
          {filtered.map((topic) => {
            const author = topic.users as { name: string } | null
            const cat = topic.forum_categories as { id: string; name: string } | null
            return (
              <Link
                key={topic.id}
                href={`/forum/${topic.id}`}
                className="flex items-start justify-between gap-8 py-5 hover:opacity-70 transition-opacity"
              >
                <div className="flex flex-col gap-1.5 min-w-0">
                  {cat && (
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#0B7A3B]">{cat.name}</span>
                  )}
                  <p className="text-base font-black text-zinc-900 leading-tight">{topic.title}</p>
                  <p className="text-xs text-zinc-400">
                    {author?.name} · {new Date(topic.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <div className="flex items-center gap-5 shrink-0 pt-1 text-xs text-zinc-400">
                  <span>{topic.replies_count ?? 0} respostas</span>
                  <span>{topic.views_count ?? 0} views</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
