'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { getAuthUser } from '@/app/lib/auth'
import { formatFileSize } from '@/app/lib/files'
import { GAME_MEDIA_SELECT, sortGameMedia, type GameMedia } from '@/app/lib/gameMedia'
import { LoadingState } from '@/app/components/LoadingScreen'

const GAMES_BUCKET = 'games'

type Game = {
  id: string
  user_id: string
  title: string
  about: string
  instructions: string
  executable_url: string
  executable_name: string | null
  executable_size: number | null
  community_game_media: GameMedia[]
  approved: boolean
  rejection_message: string | null
  created_at: string
  users: { name: string } | null
}

export default function JogoDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [canManage, setCanManage] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    async function load() {
      const [user, { data }] = await Promise.all([
        getAuthUser(),
        supabase
          .from('community_games')
          .select(`id, user_id, title, about, instructions, executable_url, executable_name, executable_size, ${GAME_MEDIA_SELECT}, approved, rejection_message, created_at, users(name)`)
          .eq('id', id)
          .maybeSingle(),
      ])
      const loaded = data as unknown as Game | null
      setGame(loaded && { ...loaded, community_game_media: sortGameMedia(loaded.community_game_media) })
      if (user && data) {
        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
        setCanManage(data.user_id === user.id || profile?.role === 'admin')
      }
      setLoading(false)
    }
    void load()
  }, [id])

  async function handleDelete() {
    if (!game || !window.confirm('Excluir este jogo? Essa ação não pode ser desfeita.')) return
    setDeleting(true)
    const { error } = await supabase.from('community_games').delete().eq('id', game.id)
    if (error) {
      setDeleting(false)
      return
    }
    const paths = [game.executable_url, ...game.community_game_media.map((m) => m.url)]
      .map((url) => url.split(`/object/public/${GAMES_BUCKET}/`)[1])
      .filter((path): path is string => Boolean(path))
    if (paths.length > 0) await supabase.storage.from(GAMES_BUCKET).remove(paths)
    router.push('/jogos')
  }

  if (loading) return <LoadingState message="Carregando jogo" />

  const media = game?.community_game_media ?? []
  const current = media[selected] ?? media[0]

  if (!game) {
    return (
      <div className="min-h-screen bg-white px-4 py-10 dark:bg-zinc-950 md:px-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-zinc-500 dark:text-zinc-400">Jogo não encontrado.</p>
          <Link href="/jogos" className="mt-4 inline-block text-sm text-[#2F9E41] hover:underline">← Voltar para jogos</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white px-4 py-10 dark:bg-zinc-950 md:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/jogos" className="text-sm text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
          ← Voltar para jogos
        </Link>

        {!game.approved && (
          <p className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            game.rejection_message ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'
          }`}>
            {game.rejection_message
              ? <><strong>Jogo reprovado:</strong> {game.rejection_message}</>
              : 'Este jogo está aguardando aprovação e só é visível para você e para os administradores.'}
          </p>
        )}

        {current && (
          <div className="mt-6">
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-900">
              {current.media_type === 'video' ? (
                <video key={current.url} src={current.url} className="h-full w-full bg-black object-contain" controls playsInline />
              ) : (
                <Image src={current.url} alt={game.title} fill className="object-cover" />
              )}
            </div>
            {media.length > 1 && (
              <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
                {media.map((item, i) => (
                  <button
                    key={item.url}
                    type="button"
                    onClick={() => setSelected(i)}
                    aria-label={`Ver mídia ${i + 1}`}
                    className={`relative aspect-video overflow-hidden rounded-lg bg-zinc-100 ring-2 transition dark:bg-zinc-900 ${
                      i === selected ? 'ring-[#2F9E41]' : 'ring-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    {item.media_type === 'video' ? (
                      <>
                        <video src={item.url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-sm text-white">▶</span>
                      </>
                    ) : (
                      <Image src={item.url} alt="" fill className="object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <header className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{game.title}</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {game.users?.name ? `por ${game.users.name} · ` : ''}
              {new Date(game.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <a
            href={game.executable_url}
            download={game.executable_name ?? undefined}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#2F9E41] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1={12} y1={15} x2={12} y2={3} />
            </svg>
            Baixar{game.executable_size ? ` (${formatFileSize(game.executable_size)})` : ''}
          </a>
        </header>

        <section className="mt-8">
          <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">Sobre o jogo</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{game.about}</p>
        </section>

        <section className="mt-8">
          <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">Instruções de uso</h2>
          <p className="whitespace-pre-wrap rounded-xl bg-zinc-50 p-4 text-sm leading-relaxed text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">{game.instructions}</p>
        </section>

        <p className="mt-8 rounded-xl bg-zinc-50 px-4 py-3 text-xs text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          Este jogo foi enviado por um membro da comunidade. Só execute arquivos em que você confia.
        </p>

        {canManage && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="mt-6 text-sm text-red-500 transition hover:text-red-700 disabled:opacity-50"
          >
            {deleting ? 'Excluindo...' : 'Excluir jogo'}
          </button>
        )}
      </div>
    </div>
  )
}
