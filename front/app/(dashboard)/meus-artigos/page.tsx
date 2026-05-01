'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'

type Article = {
  id: string
  title: string
  slug: string
  summary: string
  cover_image_url: string | null
  status: 'rascunho' | 'publicado'
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('articles')
        .select('id, title, slug, summary, cover_image_url, status, created_at, article_tags(tag_name)')
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
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="w-full max-w-2xl mx-auto">
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
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition"
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
                className="bg-white rounded-2xl border border-zinc-200 overflow-hidden flex gap-4 p-4"
              >
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
                        article.status === 'publicado'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-zinc-100 text-zinc-500'
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
