'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { LoadingState } from '@/app/components/LoadingScreen'

type Stats = {
  pendingProjects: number
  pendingArticles: number
  pendingJobs: number
  totalUsers: number
  npsResponses: number
  npsScore: number | null
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ pendingProjects: 0, pendingArticles: 0, pendingJobs: 0, totalUsers: 0, npsResponses: 0, npsScore: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [
        { count: pendingProjects },
        { count: pendingArticles },
        { count: pendingJobs },
        { count: totalUsers },
        { data: npsResponses },
      ] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('approved', false).is('rejection_message', null),
        supabase.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
        supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('is_active', false),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('nps_responses').select('score'),
      ])
      const promoters = (npsResponses ?? []).filter((response) => response.score >= 9).length
      const detractors = (npsResponses ?? []).filter((response) => response.score <= 6).length
      const npsScore = npsResponses?.length ? Math.round(((promoters - detractors) / npsResponses.length) * 100) : null
      setStats({
        pendingProjects: pendingProjects ?? 0,
        pendingArticles: pendingArticles ?? 0,
        pendingJobs: pendingJobs ?? 0,
        totalUsers: totalUsers ?? 0,
        npsResponses: npsResponses?.length ?? 0,
        npsScore,
      })
      setLoading(false)
    }
    load()
  }, [])

  const cards = [
    { label: 'Projetos pendentes', value: stats.pendingProjects, href: '/admin/projetos', urgent: stats.pendingProjects > 0 },
    { label: 'Artigos para revisão', value: stats.pendingArticles, href: '/admin/artigos', urgent: stats.pendingArticles > 0 },
    { label: 'Vagas aguardando', value: stats.pendingJobs, href: '/admin/vagas', urgent: stats.pendingJobs > 0 },
    { label: 'Total de usuários', value: stats.totalUsers, href: '/admin/usuarios', urgent: false },
    { label: `${stats.npsResponses} resposta${stats.npsResponses !== 1 ? 's' : ''} de NPS`, value: stats.npsScore ?? '-', href: '/admin/nps', urgent: false },
  ]

  if (loading) return <LoadingState message="Carregando painel administrativo" />

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 mb-1">Visão geral</h1>
      <p className="text-sm text-zinc-500 mb-8">Itens que precisam de atenção</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={`rounded-2xl border p-5 flex flex-col gap-2 hover:shadow-sm transition ${
              card.urgent ? 'border-amber-200 bg-amber-50' : 'border-zinc-200 bg-white'
            }`}
          >
            <span className={`text-3xl font-semibold ${card.urgent ? 'text-amber-700' : 'text-zinc-900'}`}>
              {card.value}
            </span>
            <span className={`text-xs font-medium ${card.urgent ? 'text-amber-600' : 'text-zinc-500'}`}>
              {card.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
