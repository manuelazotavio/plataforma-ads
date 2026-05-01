import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import ArticleFilters from '@/app/components/ArticleFilters'

export default async function ArtigosPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; autor?: string }>
}) {
  const { tag, autor } = await searchParams

  
  let tagArticleIds: string[] | null = null
  if (tag) {
    const { data } = await supabase
      .from('article_tags')
      .select('article_id')
      .eq('tag_name', tag)
    tagArticleIds = data?.map((r) => r.article_id) ?? []
  }

  
  let query = supabase
    .from('articles')
    .select('id, title, slug, summary, cover_image_url, published_at, like_count, users(id, name, avatar_url), article_tags(tag_name)')
    .eq('status', 'publicado')
    .order('published_at', { ascending: false })

  if (tagArticleIds !== null) {
    query = tagArticleIds.length > 0
      ? query.in('id', tagArticleIds)
      : query.in('id', ['00000000-0000-0000-0000-000000000000'])
  }
  if (autor) query = query.eq('user_id', autor)

  
  const [{ data: articles }, { data: tagRows }, { data: authorRows }] = await Promise.all([
    query,
    supabase.from('article_tags').select('article_id, tag_name, articles!inner(status)').eq('articles.status', 'publicado'),
    supabase.from('articles').select('user_id, users(id, name)').eq('status', 'publicado').not('user_id', 'is', null),
  ])

  const allTags = [...new Set((tagRows ?? []).map((r) => r.tag_name))].sort()

  type AuthorRow = { user_id: string; users: { id: string; name: string } | null }
  const seenIds = new Set<string>()
  const allAuthors = (authorRows as AuthorRow[] ?? [])
    .filter((r) => r.users && !seenIds.has(r.user_id) && seenIds.add(r.user_id))
    .map((r) => ({ id: r.users!.id, name: r.users!.name }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Artigos</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {articles?.length ?? 0} artigo{(articles?.length ?? 0) !== 1 ? 's' : ''} publicado{(articles?.length ?? 0) !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href="/meus-artigos"
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
          >
            Meus artigos
          </Link>
        </div>

        <ArticleFilters tags={allTags} authors={allAuthors} />

        {!articles || articles.length === 0 ? (
          <div className="text-center py-20 text-zinc-400">
            <p className="text-lg">Nenhum artigo encontrado.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {articles.map((article) => {
              const author = article.users as { name: string; avatar_url: string | null } | null
              const tags = article.article_tags as { tag_name: string }[]

              return (
                <Link
                  key={article.id}
                  href={`/artigos/${article.id}`}
                  className="bg-white rounded-2xl border border-zinc-200 overflow-hidden flex gap-4 p-4 hover:border-zinc-300 hover:shadow-sm transition"
                >
                  {article.cover_image_url && (
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0">
                      <Image src={article.cover_image_url} alt={article.title} fill className="object-cover" />
                    </div>
                  )}

                  <div className="flex flex-col justify-between flex-1 min-w-0">
                    <div>
                      <h2 className="text-sm font-semibold text-zinc-900 line-clamp-1 mb-1">{article.title}</h2>
                      <p className="text-xs text-zinc-500 line-clamp-2">{article.summary}</p>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {tags.map(({ tag_name }) => (
                            <span key={tag_name} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                              {tag_name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        {author?.avatar_url
                          ? <Image src={author.avatar_url} alt={author.name} width={16} height={16} className="w-4 h-4 rounded-full object-cover shrink-0" />
                          : <div className="w-4 h-4 rounded-full bg-zinc-200" />
                        }
                        <span className="text-xs text-zinc-400">{author?.name}</span>
                        {article.published_at && (
                          <>
                            <span className="text-zinc-300">·</span>
                            <span className="text-xs text-zinc-400">{new Date(article.published_at).toLocaleDateString('pt-BR')}</span>
                          </>
                        )}
                      </div>
                      {(article.like_count as number) > 0 && (
                        <span className="flex items-center gap-1 text-xs text-zinc-400">
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>
                          {article.like_count}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
