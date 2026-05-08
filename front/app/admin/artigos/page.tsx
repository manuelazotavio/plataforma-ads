'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'

type Article = {
  id: string
  title: string
  summary: string | null
  status: string
  rejection_message: string | null
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
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectMessage, setRejectMessage] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('articles')
        .select('id, title, summary, status, rejection_message, cover_image_url, created_at, users(name, avatar_url), article_tags(tag_name)')
        .neq('status', 'rascunho')
        .order('created_at', { ascending: false })
      setArticles((data as unknown as Article[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function publish(id: string) {
    setUpdatingId(id)
    await supabase.from('articles').update({ status: 'publicado', rejection_message: null }).eq('id', id)
    setArticles((prev) => prev.map((a) => a.id === id ? { ...a, status: 'publicado', rejection_message: null } : a))
    setUpdatingId(null)
  }

  async function reject(id: string) {
    const msg = rejectMessage.trim()
    if (!msg) return
    setUpdatingId(id)
    await supabase.from('articles').update({ status: 'rejeitado', rejection_message: msg }).eq('id', id)
    setArticles((prev) => prev.map((a) => a.id === id ? { ...a, status: 'rejeitado', rejection_message: msg } : a))
    setRejectingId(null)
    setRejectMessage('')
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
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Artigos</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {pendingCount} aguardando revisão
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-1 rounded-lg border border-zinc-200 bg-white p-1 sm:w-auto">
          {(['pendentes', 'publicados', 'rejeitados', 'todos'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition capitalize sm:flex-none ${
                filter === f ? 'bg-[#2F9E41] text-white' : 'text-zinc-500 hover:text-zinc-900'
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
                className={`bg-white rounded-2xl border p-4 flex flex-col gap-3 ${
                  article.status === 'pendente' ? 'border-amber-200' :
                  article.status === 'rejeitado' ? 'border-red-200' :
                  'border-zinc-200'
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row">
                  {article.cover_image_url && (
                    <div className="relative h-36 w-full overflow-hidden rounded-lg bg-zinc-100 sm:h-16 sm:w-20 sm:shrink-0">
                      <Image src={article.cover_image_url} alt={article.title} fill className="object-cover" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
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

                  <div className="grid grid-cols-2 gap-1.5 sm:flex sm:shrink-0 sm:flex-col sm:justify-center">
                    {article.status !== 'publicado' && (
                      <button
                        onClick={() => publish(article.id)}
                        disabled={updatingId === article.id}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 transition"
                      >
                        Publicar
                      </button>
                    )}
                    {article.status !== 'rejeitado' && (
                      <button
                        onClick={() => { setRejectingId(article.id); setRejectMessage('') }}
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
                      Ver
                    </a>
                  </div>
                </div>

                {article.rejection_message && (
                  <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700">
                    <span className="font-semibold">Mensagem enviada ao aluno:</span> {article.rejection_message}
                  </div>
                )}

                {rejectingId === article.id && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                    <textarea
                      value={rejectMessage}
                      onChange={(e) => setRejectMessage(e.target.value)}
                      placeholder="Descreva o que precisa ser alterado..."
                      rows={2}
                      className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-900 outline-none resize-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                    />
                    <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-col">
                      <button
                        onClick={() => reject(article.id)}
                        disabled={!rejectMessage.trim() || updatingId === article.id}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 transition"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => { setRejectingId(null); setRejectMessage('') }}
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
