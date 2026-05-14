import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import LikeButton from '@/app/components/LikeButton'
import UserAvatar from '@/app/components/UserAvatar'

export const dynamic = 'force-dynamic'
import Comments from '@/app/components/Comments'

export default async function ArtigoDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: article } = await supabase
    .from('articles')
    .select('id, title, summary, content, cover_image_url, published_at, like_count, status, users(id, name, avatar_url), article_tags(tag_name)')
    .eq('id', id)
    .eq('status', 'publicado')
    .single()

  if (!article) notFound()

  const author = article.users as unknown as { id: string; name: string; avatar_url: string | null } | null
  const tags = article.article_tags as { tag_name: string }[]

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="w-full">

        <Link href="/artigos" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition mb-6">
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          Todos os artigos
        </Link>

        {article.cover_image_url && (
          <div className="relative w-full h-64 rounded-2xl overflow-hidden bg-zinc-100 mb-8">
            <Image src={article.cover_image_url} alt={article.title} fill className="object-cover" />
          </div>
        )}

        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-zinc-900 leading-snug mb-3">{article.title}</h1>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {tags.map(({ tag_name }) => (
                <span key={tag_name} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium capitalize text-zinc-600">
                  {tag_name}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pb-6 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              {author ? (
                <Link href={`/usuarios/${author.id}`} className="flex items-center gap-2 hover:opacity-80 transition">
                  {author.avatar_url
                    ? <Image src={author.avatar_url} alt={author.name} width={28} height={28} className="w-7 h-7 rounded-full object-cover shrink-0" />
                    : <UserAvatar name={author.name} className="h-7 w-7" sizes="28px" />
                  }
                  <span className="text-sm text-zinc-600 font-medium">{author.name}</span>
                </Link>
              ) : (
                <span className="text-sm text-zinc-600 font-medium">Anonimo</span>
              )}
              {article.published_at && (
                <>
                  <span className="text-zinc-300">&bull;</span>
                  <span className="text-sm text-zinc-400">
                    {new Date(article.published_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </>
              )}
            </div>
            <LikeButton type="article" targetId={article.id} initialCount={article.like_count} />
          </div>
        </div>

        {article.summary && (
          <p className="text-base text-zinc-500 leading-relaxed mb-8 italic">{article.summary}</p>
        )}

        <div
          className="prose prose-zinc prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        <Comments type="article" targetId={article.id} />

      </div>
    </div>
  )
}
