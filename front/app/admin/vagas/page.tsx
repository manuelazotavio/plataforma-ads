'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

const CATEGORIES = [
  { value: 'estagio', label: 'Estágio' },
  { value: 'bolsa', label: 'Bolsa' },
  { value: 'evento_externo', label: 'Evento externo' },
]

type Job = {
  id: string
  position: string
  company: string
  location: string | null
  job_type: string | null
  work_mode: string | null
  category: string | null
  is_active: boolean
  created_at: string
  job_tags: { tag_name: string }[]
}

type Filter = 'pendentes' | 'ativas' | 'todas'

export default function AdminVagasPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('pendentes')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('jobs')
        .select('id, position, company, location, job_type, work_mode, is_active, created_at, job_tags(tag_name)')
        .order('created_at', { ascending: false })
      setJobs((data as Job[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function toggle(id: string, value: boolean) {
    setUpdatingId(id)
    await supabase.from('jobs').update({ is_active: value }).eq('id', id)
    setJobs((prev) => prev.map((j) => j.id === id ? { ...j, is_active: value } : j))
    setUpdatingId(null)
  }

  const filtered = jobs.filter((j) => {
    if (filter === 'pendentes') return !j.is_active
    if (filter === 'ativas')    return j.is_active
    return true
  })

  const pendingCount = jobs.filter((j) => !j.is_active).length

  if (loading) return <p className="text-sm text-zinc-500">Carregando...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Vagas</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {pendingCount} aguardando aprovação
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1">
          {(['pendentes', 'ativas', 'todas'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition capitalize ${
                filter === f ? 'bg-[#2F9E41] text-white' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">Nenhuma vaga {filter === 'todas' ? '' : filter}.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((job) => (
            <div
              key={job.id}
              className={`bg-white rounded-2xl border p-4 flex gap-4 ${
                !job.is_active ? 'border-amber-200' : 'border-zinc-200'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{job.position}</p>
                    <p className="text-xs text-zinc-400">
                      {job.company}{job.location ? ` · ${job.location}` : ''} · {new Date(job.created_at).toLocaleDateString('pt-BR')}
                    </p>
                    {job.category && (
                      <span className="text-xs font-semibold text-[#2F9E41]">
                        {CATEGORIES.find((c) => c.value === job.category)?.label}
                      </span>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    job.is_active ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {job.is_active ? 'ativa' : 'pendente'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {job.job_type && (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">{job.job_type}</span>
                  )}
                  {job.work_mode && (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">{job.work_mode}</span>
                  )}
                  {job.job_tags.map(({ tag_name }) => (
                    <span key={tag_name} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">{tag_name}</span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5 shrink-0 justify-center">
                {!job.is_active ? (
                  <button
                    onClick={() => toggle(job.id, true)}
                    disabled={updatingId === job.id}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 transition"
                  >
                    Aprovar
                  </button>
                ) : (
                  <button
                    onClick={() => toggle(job.id, false)}
                    disabled={updatingId === job.id}
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 transition"
                  >
                    Desativar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
