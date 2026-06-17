'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { LoadingState } from '@/app/components/LoadingScreen'
import UserAvatar from '@/app/components/UserAvatar'

type NpsResponse = {
  id: string
  score: number
  comment: string | null
  created_at: string
  updated_at: string
  users: { id: string; name: string; avatar_url: string | null; email: string | null } | null
}

type NpsSummary = {
  total: number
  promoters: number
  passives: number
  detractors: number
  nps: number
  average: number
}

export default function AdminNpsPage() {
  const [responses, setResponses] = useState<NpsResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data, error: loadError } = await supabase
        .from('nps_responses')
        .select('id, score, comment, created_at, updated_at, users(id, name, avatar_url, email)')
        .order('updated_at', { ascending: false })

      if (loadError) setError('Erro ao carregar respostas de NPS: ' + loadError.message)
      else setResponses((data as unknown as NpsResponse[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const summary = useMemo(() => calculateSummary(responses), [responses])

  if (loading) return <LoadingState message="Carregando NPS" />

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900">NPS da plataforma</h1>
        <p className="mt-1 text-sm text-zinc-500">Satisfação dos usuários com o ADS Conecta.</p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="NPS" value={summary.total ? summary.nps : '-'} highlight />
        <Metric label="Respostas" value={summary.total} />
        <Metric label="Promotores" value={summary.promoters} tone="green" />
        <Metric label="Neutros" value={summary.passives} tone="amber" />
        <Metric label="Detratores" value={summary.detractors} tone="red" />
      </div>

      <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-900">Distribuição das notas</p>
          <p className="text-xs text-zinc-400">Média: {summary.total ? summary.average.toFixed(1) : '-'}</p>
        </div>
        <div className="grid grid-cols-11 gap-1">
          {Array.from({ length: 11 }, (_, score) => {
            const count = responses.filter((response) => response.score === score).length
            const pct = summary.total ? Math.round((count / summary.total) * 100) : 0
            return (
              <div key={score} className="flex flex-col items-center gap-1">
                <div className="flex h-24 w-full items-end rounded bg-zinc-50 px-1">
                  <div
                    className={`w-full rounded-t ${score >= 9 ? 'bg-green-500' : score >= 7 ? 'bg-amber-400' : 'bg-red-500'}`}
                    style={{ height: `${Math.max(6, pct)}%` }}
                    title={`${count} resposta${count !== 1 ? 's' : ''}`}
                  />
                </div>
                <span className="text-xs font-semibold text-zinc-500">{score}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-900">Respostas recentes</h2>
        </div>
        {responses.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-zinc-400">Nenhuma resposta ainda.</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {responses.map((response) => (
              <div key={response.id} className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1fr)_6rem_8rem] md:items-center">
                <div className="flex min-w-0 items-start gap-3">
                  <UserAvatar src={response.users?.avatar_url} name={response.users?.name} className="h-10 w-10" sizes="40px" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900">{response.users?.name ?? 'Usuário removido'}</p>
                    {response.comment ? (
                      <p className="mt-1 text-sm leading-relaxed text-zinc-500">{response.comment}</p>
                    ) : (
                      <p className="mt-1 text-sm italic text-zinc-300">Sem comentário.</p>
                    )}
                  </div>
                </div>
                <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${scoreClass(response.score)}`}>
                  Nota {response.score}
                </span>
                <span className="text-xs text-zinc-400 md:text-right">{formatDate(response.updated_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function calculateSummary(responses: NpsResponse[]): NpsSummary {
  const total = responses.length
  const promoters = responses.filter((response) => response.score >= 9).length
  const passives = responses.filter((response) => response.score >= 7 && response.score <= 8).length
  const detractors = responses.filter((response) => response.score <= 6).length
  const nps = total ? Math.round(((promoters - detractors) / total) * 100) : 0
  const average = total ? responses.reduce((sum, response) => sum + response.score, 0) / total : 0
  return { total, promoters, passives, detractors, nps, average }
}

function Metric({ label, value, highlight, tone }: { label: string; value: number | string; highlight?: boolean; tone?: 'green' | 'amber' | 'red' }) {
  const color =
    highlight ? 'text-[#2F9E41]' :
    tone === 'green' ? 'text-green-600' :
    tone === 'amber' ? 'text-amber-600' :
    tone === 'red' ? 'text-red-600' :
    'text-zinc-900'

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <p className={`text-3xl font-semibold ${color}`}>{value}</p>
      <p className="mt-1 text-xs font-medium text-zinc-500">{label}</p>
    </div>
  )
}

function scoreClass(score: number) {
  if (score >= 9) return 'bg-green-50 text-green-700'
  if (score >= 7) return 'bg-amber-50 text-amber-700'
  return 'bg-red-50 text-red-700'
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
