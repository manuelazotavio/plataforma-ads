'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'
import { LoadingState } from '@/app/components/LoadingScreen'
import { formatFileSize } from '@/app/lib/files'

type Game = {
  id: string
  title: string
  about: string
  executable_url: string
  executable_name: string | null
  executable_size: number | null
  media_url: string | null
  media_type: 'image' | 'video' | null
  approved: boolean
  rejection_message: string | null
  created_at: string
  users: { name: string } | null
}

type Filter = 'pendentes' | 'aprovados' | 'reprovados' | 'todos'

function gameStatus(g: Game) {
  if (g.approved) return 'aprovado'
  if (g.rejection_message) return 'reprovado'
  return 'pendente'
}

export default function AdminJogosPage() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('pendentes')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectMessage, setRejectMessage] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('community_games')
        .select('id, title, about, executable_url, executable_name, executable_size, media_url, media_type, approved, rejection_message, created_at, users(name)')
        .order('created_at', { ascending: false })
      setGames((data as unknown as Game[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function setReview(id: string, patch: { approved: boolean; rejection_message: string | null }, failure: string) {
    setUpdatingId(id)
    setActionError(null)
    const { data, error } = await supabase
      .from('community_games')
      .update(patch)
      .eq('id', id)
      .select('approved, rejection_message')
      .single()

    if (error || !data) {
      setActionError(error?.message ?? failure)
      setUpdatingId(null)
      return false
    }

    setGames((prev) => prev.map((g) => g.id === id ? { ...g, ...data } : g))
    setUpdatingId(null)
    return true
  }

  async function notifyAuthor(id: string, decision: 'aprovado' | 'reprovado') {
    const { data, error } = await supabase.functions.invoke('send-game-review', {
      body: { game_id: id },
    })
    if (error || data?.error) {
      setActionError(`O jogo foi ${decision}, mas não foi possível enviar o e-mail ao autor.`)
    }
  }

  async function approve(id: string) {
    const ok = await setReview(id, { approved: true, rejection_message: null }, 'Não foi possível aprovar o jogo.')
    if (ok) await notifyAuthor(id, 'aprovado')
  }

  const revoke = (id: string) =>
    setReview(id, { approved: false, rejection_message: null }, 'Não foi possível devolver o jogo para revisão.')

  async function reject(id: string) {
    const msg = rejectMessage.trim()
    if (!msg) return
    const ok = await setReview(id, { approved: false, rejection_message: msg }, 'Não foi possível reprovar o jogo.')
    if (ok) {
      setRejectingId(null)
      setRejectMessage('')
      await notifyAuthor(id, 'reprovado')
    }
  }

  const filtered = games.filter((g) => {
    const s = gameStatus(g)
    if (filter === 'pendentes') return s === 'pendente'
    if (filter === 'aprovados') return s === 'aprovado'
    if (filter === 'reprovados') return s === 'reprovado'
    return true
  })

  const pendingCount = games.filter((g) => gameStatus(g) === 'pendente').length

  if (loading) return <LoadingState message="Carregando jogos" />

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Jogos</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-1 rounded-lg border border-zinc-200 bg-white p-1 sm:w-auto">
          {(['pendentes', 'aprovados', 'reprovados', 'todos'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition sm:flex-none ${
                filter === f ? 'bg-[#2F9E41] text-white' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Os jogos são arquivos executáveis enviados por usuários. Baixe e verifique o arquivo antes de aprovar.
      </p>

      {actionError && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>
      )}

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-zinc-400">
          Nenhum jogo {filter === 'todos' ? '' : filter}.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((game) => {
            const status = gameStatus(game)

            return (
              <div
                key={game.id}
                className={`flex flex-col gap-3 rounded-2xl border bg-white p-4 ${
                  status === 'pendente' ? 'border-amber-200' : status === 'reprovado' ? 'border-red-200' : 'border-zinc-200'
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="relative h-36 w-full overflow-hidden rounded-lg bg-zinc-100 sm:h-16 sm:w-28 sm:shrink-0">
                    {game.media_url && game.media_type === 'video' ? (
                      <video src={game.media_url} className="h-full w-full object-cover" muted playsInline />
                    ) : game.media_url ? (
                      <Image src={game.media_url} alt={game.title} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-zinc-300">sem mídia</div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">{game.title}</p>
                        <p className="text-xs text-zinc-400">
                          {game.users?.name} · {new Date(game.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-[11px] font-semibold ${
                        status === 'aprovado' ? 'border-green-200 text-green-700' :
                        status === 'reprovado' ? 'border-red-200 text-red-600' :
                        'border-amber-200 text-amber-700'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          status === 'aprovado' ? 'bg-green-500' : status === 'reprovado' ? 'bg-red-500' : 'bg-amber-500'
                        }`} />
                        <span className="capitalize">{status}</span>
                      </span>
                    </div>
                    <p className="line-clamp-2 text-xs text-zinc-500">{game.about}</p>
                    <a
                      href={game.executable_url}
                      download={game.executable_name ?? undefined}
                      className="mt-1.5 inline-block text-xs font-medium text-[#2F9E41] hover:underline"
                    >
                      Baixar {game.executable_name ?? 'executável'}
                      {game.executable_size ? ` (${formatFileSize(game.executable_size)})` : ''}
                    </a>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 sm:flex sm:shrink-0 sm:flex-col sm:justify-center">
                    {status !== 'aprovado' && (
                      <button
                        onClick={() => approve(game.id)}
                        disabled={updatingId === game.id}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                      >
                        Aprovar
                      </button>
                    )}
                    {status !== 'pendente' && (
                      <button
                        onClick={() => revoke(game.id)}
                        disabled={updatingId === game.id}
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
                      >
                        Devolver para revisão
                      </button>
                    )}
                    {status !== 'reprovado' && (
                      <button
                        onClick={() => { setRejectingId(game.id); setRejectMessage('') }}
                        disabled={updatingId === game.id}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        Reprovar
                      </button>
                    )}
                    <a
                      href={`/jogos/${game.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-zinc-200 px-3 py-1.5 text-center text-xs font-medium text-zinc-500 transition hover:bg-zinc-50"
                    >
                      Ver
                    </a>
                  </div>
                </div>

                {game.rejection_message && (
                  <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                    <span className="font-semibold">Mensagem para o autor:</span> {game.rejection_message}
                  </div>
                )}

                {rejectingId === game.id && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                    <textarea
                      value={rejectMessage}
                      onChange={(e) => setRejectMessage(e.target.value)}
                      placeholder="Descreva o que precisa ser alterado..."
                      rows={2}
                      className="flex-1 resize-none rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                    />
                    <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-col">
                      <button
                        onClick={() => reject(game.id)}
                        disabled={!rejectMessage.trim() || updatingId === game.id}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => { setRejectingId(null); setRejectMessage('') }}
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50"
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
