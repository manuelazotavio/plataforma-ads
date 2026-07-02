import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { injectMentionsIntoHtml } from '@/app/lib/mentions'

export const dynamic = 'force-dynamic'

const statusLabel: Record<string, string> = {
  pendente:  'Pendente de revisão',
  rejeitado: 'Rejeitado',
  rascunho:  'Rascunho',
  publicado:  'Publicado',
}

const statusClass: Record<string, string> = {
  pendente:  'bg-amber-50 border-amber-200 text-amber-800',
  rejeitado: 'bg-red-50 border-red-200 text-red-800',
  rascunho:  'bg-zinc-100 border-zinc-200 text-zinc-600',
  publicado:  'bg-green-50 border-green-200 text-green-800',
}

export default async function AdminArtigoPreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: article } = await supabase
    .from('articles')
    .select('id, title, summary, content, cover_image_url, published_at, status, rejection_message, users(id, name, avatar_url), article_tags(tag_name)')
    .eq('id', id)
    .single()

  if (!article) notFound()

  const author = article.users as unknown as { id: string; name: string; avatar_url: string | null } | null
  const tags = article.article_tags as { tag_name: string }[]
  const cfg = statusClass[article.status] ?? statusClass.rascunho

  return (
    <div className="min-h-screen bg-white py-8 px-4">
      <div className="w-full max-w-3xl">

        <Link href="/admin/artigos" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition mb-6">
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          Voltar para artigos
        </Link>

        <div className={`mb-6 rounded-xl border px-4 py-3 text-sm font-medium ${cfg}`}>
          {statusLabel[article.status] ?? article.status}
          {article.rejection_message && (
            <p className="mt-1 font-normal opacity-80">Motivo: {article.rejection_message}</p>
          )}
        </div>

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

          <div className="flex items-center gap-2 pb-6 border-b border-zinc-100">
            {author?.avatar_url && (
              <Image src={author.avatar_url} alt={author.name} width={28} height={28} className="w-7 h-7 rounded-full object-cover shrink-0" />
            )}
            <span className="text-sm text-zinc-600 font-medium">{author?.name ?? 'Anônimo'}</span>
          </div>
        </div>

        {article.summary && (
          <p className="text-base text-zinc-500 leading-relaxed mb-8 italic">{article.summary}</p>
        )}

        <div
          className="prose prose-zinc prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: injectMentionsIntoHtml(article.content) }}
        />

      </div>
    </div>
  )
}
