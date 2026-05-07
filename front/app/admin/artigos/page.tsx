'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'

type Article = {
  id: string
  title: string
  summary: string | null
  status: string
  cover_image_url: string | null
  created_at: string
  users: { name: string; avatar_url: string | null } | null
  article_tags: { tag_name: string }[]
}

type Filter = 'pendentes' | 'publicados' | 'rejeitados' | 'todos'

const statusConfig: Record<string, { label: string; class: string }> = {
  pendente:   { label: 'pendente',   class: 'bg-amber-100 text-amber-700' },
  publicado:  { label: 'publicado',  class: 'bg-green-100 text-green-700' },
  rejeitado:  { label: 'rejeitado',  class: 'bg-red-100 text-red-600' },
  rascunho:   { label: 'rascunho',   class: 'bg-zinc-100 text-zinc-500' },
}

export default function AdminArtigosPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('pendentes')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('articles')
        .select('id, title, summary, status, cover_image_url, created_at, users(name, avatar_url), article_tags(tag_name)')
        .neq('status', 'rascunho')
        .order('created_at', { ascending: false })
      setArticles((data as Article[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function setStatus(id: string, status: string) {
    setUpdatingId(id)
    await supabase.from('articles').update({ status }).eq('id', id)
    setArticles((prev) => prev.map((a) => a.id === id ? { ...a, status } : a))
    setUpdatingId(null)
  }

  const filtered = articles.filter((a) => {
    if (filter === 'pendentes')  return a.status === 'pendente'
    if (filter === 'publicados') return a.status === 'publicado'
    if (filter === 'rejeitados') return a.status === 'rejeitado'
    return true
  })

  const pendingCount = articles.filter((a) => a.status === 'pendente').length

  if (loading) return <p className="text-sm text-zinc-500">Carregando...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Artigos</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {pendingCount} aguardando revisão
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1">
          {(['pendentes', 'publicados', 'rejeitados', 'todos'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition capitalize ${
                filter === f ? 'bg-[#0B7A3B] text-white' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">Nenhum artigo {filter === 'todos' ? '' : filter}.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((article) => {
            const cfg = statusConfig[article.status] ?? statusConfig.rascunho

            return (
              <div
                key={article.id}
                className={`bg-white rounded-2xl border p-4 flex gap-4 ${
                  article.status === 'pendente' ? 'border-amber-200' : 'border-zinc-200'
                }`}
              >
                {article.cover_image_url && (
                  <div className="relative w-20 h-16 rounded-lg overflow-hidden bg-zinc-100 shrink-0">
                    <Image src={article.cover_image_url} alt={article.title} fill className="object-cover" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 line-clamp-1">{article.title}</p>
                      <p className="text-xs text-zinc-400">
                        {article.users?.name} · {new Date(article.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.class}`}>
                      {cfg.label}
                    </span>
                  </div>
                  {article.article_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {article.article_tags.map(({ tag_name }) => (
                        <span key={tag_name} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                          {tag_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 shrink-0 justify-center">
                  {article.status !== 'publicado' && (
                    <button
                      onClick={() => setStatus(article.id, 'publicado')}
                      disabled={updatingId === article.id}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 transition"
                    >
                      Publicar
                    </button>
                  )}
                  {article.status !== 'rejeitado' && (
                    <button
                      onClick={() => setStatus(article.id, 'rejeitado')}
                      disabled={updatingId === article.id}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
                    >
                      Rejeitar
                    </button>
                  )}
                  <a
                    href={`/artigos/${article.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-center font-medium text-zinc-500 hover:bg-zinc-50 transition"
                  >
                    Ver ↗
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
