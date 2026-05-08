'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'
import { getAuthUser } from '@/app/lib/auth'

type Article = {
  id: string
  title: string
  slug: string
  summary: string
  cover_image_url: string | null
  status: 'rascunho' | 'pendente' | 'publicado' | 'rejeitado'
  rejection_message: string | null
  created_at: string
  article_tags: { tag_name: string }[]
}

export default function MeusArtigosPage() {
  const router = useRouter()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const user = await getAuthUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('articles')
        .select('id, title, slug, summary, cover_image_url, status, rejection_message, created_at, article_tags(tag_name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setArticles(data ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Excluir "${title}"? Esta ação não pode ser desfeita.`)) return
    setDeletingId(id)
    await supabase.from('articles').delete().eq('id', id)
    setArticles((prev) => prev.filter((a) => a.id !== id))
    setDeletingId(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-sm text-zinc-500">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white px-4 py-12 md:px-6">
      <div className="w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Meus artigos</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{articles.length} artigo{articles.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/artigos"
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
            >
              Ver todos
            </Link>
            <Link
              href="/artigos/novo"
              className="rounded-lg bg-[#2F9E41] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition"
            >
              Novo artigo
            </Link>
          </div>
        </div>

        {articles.length === 0 ? (
          <div className="text-center py-20 text-zinc-400">
            <p className="text-lg mb-2">Nenhum artigo ainda</p>
            <Link href="/artigos/novo" className="text-sm text-zinc-900 underline">
              Escrever o primeiro
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {articles.map((article) => (
              <div
                key={article.id}
                className={`bg-white rounded-2xl border overflow-hidden flex flex-col p-4 gap-3 ${article.rejection_message ? 'border-red-200' : 'border-zinc-200'}`}
              >
                {article.rejection_message && (
                  <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 flex gap-2">
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-red-500 shrink-0 mt-0.5"><circle cx={12} cy={12} r={10}/><line x1={12} y1={8} x2={12} y2={12}/><line x1={12} y1={16} x2={12.01} y2={16}/></svg>
                    <div>
                      <p className="text-xs font-semibold text-red-700 mb-0.5">Artigo rejeitado — edite e reenvie</p>
                      <p className="text-xs text-red-600">{article.rejection_message}</p>
                    </div>
                  </div>
                )}
                <div className="flex gap-4">
                {article.cover_image_url && (
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0">
                    <Image src={article.cover_image_url} alt={article.title} fill className="object-cover" />
                  </div>
                )}
                <div className="flex flex-col justify-between flex-1 min-w-0">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-sm font-semibold text-zinc-900 truncate">{article.title}</h2>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        article.status === 'publicado' ? 'bg-green-100 text-green-700' :
                        article.status === 'rejeitado' ? 'bg-red-100 text-red-600' :
                        article.status === 'pendente' ? 'bg-amber-100 text-amber-700' :
                        'bg-zinc-100 text-zinc-500'
                      }`}>
                        {article.status}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 line-clamp-2">{article.summary}</p>
                    {article.article_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {article.article_tags.map(({ tag_name }) => (
                          <span key={tag_name} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                            {tag_name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-zinc-400">
                      {new Date(article.created_at).toLocaleDateString('pt-BR')}
                    </p>
                    <div className="flex gap-2">
                      <Link
                        href={`/artigos/${article.id}/editar`}
                        className="rounded-lg border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => handleDelete(article.id, article.title)}
                        disabled={deletingId === article.id}
                        className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
                      >
                        {deletingId === article.id ? 'Excluindo...' : 'Excluir'}
                      </button>
                    </div>
                  </div>
                </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
