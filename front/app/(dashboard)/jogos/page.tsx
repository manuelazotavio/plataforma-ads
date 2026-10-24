'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { getAuthUser } from '@/app/lib/auth'

const games = [
  {
    href: '/jogos/corrida',
    icon: '/games/cat-idle.png',
    title: 'Corrida da Gata',
    description: 'Desvie dos obstáculos e vá o mais longe possível com a gatinha do IF.'
  },
]

type CommunityGame = {
  id: string
  user_id: string
  title: string
  about: string
  media_url: string | null
  media_type: 'image' | 'video' | null
  approved: boolean
  rejection_message: string | null
  users: { name: string } | null
}

export default function JogosPage() {
  const [communityGames, setCommunityGames] = useState<CommunityGame[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [justSent, setJustSent] = useState(false)

  useEffect(() => {
    async function load() {
      const user = await getAuthUser()
      setUserId(user?.id ?? null)
      setJustSent(new URLSearchParams(window.location.search).get('enviado') === '1')
      const { data } = await supabase
        .from('community_games')
        .select('id, user_id, title, about, media_url, media_type, approved, rejection_message, users(name)')
        .order('created_at', { ascending: false })
      setCommunityGames(
        ((data as unknown as CommunityGame[]) ?? []).filter((g) => g.approved || g.user_id === user?.id)
      )
    }
    void load()
  }, [])

  return (
    <div className="min-h-screen bg-white px-4 py-10 dark:bg-zinc-950 md:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Jogos</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Dica: Não jogue durante as aulas :)</p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <Link
              href="/jogos/novo"
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: '#2F9E41' }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14" /><path d="M5 12h14" />
              </svg>
              Cadastrar jogo
            </Link>
          </div>
        </header>

        {justSent && (
          <p className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            Jogo enviado! Ele aparecerá para a comunidade assim que for aprovado.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {games.map((g) => (
            <Link
              key={g.href}
              href={g.href}
              className="group flex flex-col gap-4 rounded-2xl border border-zinc-100 bg-white p-6 transition hover:border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2F9E41]/10 overflow-hidden">
                <Image src={g.icon} alt={g.title} width={40} height={40} className="object-contain" />
              </div>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">{g.title}</p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{g.description}</p>
              </div>
            </Link>
          ))}
        </div>

        {communityGames.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">Jogos da comunidade</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {communityGames.map((g) => (
                <Link
                  key={g.id}
                  href={`/jogos/${g.id}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-100 bg-white transition hover:border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  <div className="relative aspect-video w-full bg-zinc-100 dark:bg-zinc-900">
                    {g.media_url && g.media_type === 'video' ? (
                      <video src={g.media_url} className="h-full w-full object-cover" muted loop playsInline />
                    ) : g.media_url ? (
                      <Image src={g.media_url} alt={g.title} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-zinc-300">sem imagem</div>
                    )}
                    {!g.approved && (
                      <span className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        g.rejection_message ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {g.rejection_message ? 'Reprovado' : 'Aguardando aprovação'}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 p-5">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">{g.title}</p>
                    <p className="line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">{g.about}</p>
                    {g.users?.name && (
                      <p className="mt-1 text-xs text-zinc-400">por {g.users.name}{g.user_id === userId ? ' (você)' : ''}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
