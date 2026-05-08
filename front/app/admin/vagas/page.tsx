'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

const CATEGORIES = [
  { value: 'estagio', label: 'Estágio' },
  { value: 'bolsa', label: 'Bolsa' },
  { value: 'evento_externo', label: 'Evento externo' },
]

const WORK_MODES = ['Presencial', 'Remoto', 'Híbrido']

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

const EMPTY_FORM = {
  position: '',
  company: '',
  category: 'estagio',
  location: '',
  job_type: '',
  work_mode: '',
  tags: '',
}

export default function AdminVagasPage() {
  const [jobs, setJobs]           = useState<Job[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState<Filter>('pendentes')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data } = await supabase
      .from('jobs')
      .select('id, position, company, location, job_type, work_mode, category, is_active, created_at, job_tags(tag_name)')
      .order('created_at', { ascending: false })
    setJobs((data as Job[]) ?? [])
    setLoading(false)
  }

  async function toggle(id: string, value: boolean) {
    setUpdatingId(id)
    await supabase.from('jobs').update({ is_active: value }).eq('id', id)
    setJobs((prev) => prev.map((j) => j.id === id ? { ...j, is_active: value } : j))
    setUpdatingId(null)
  }

  async function remove(id: string) {
    if (!confirm('Remover esta oportunidade?')) return
    setUpdatingId(id)
    await supabase.from('job_tags').delete().eq('job_id', id)
    await supabase.from('jobs').delete().eq('id', id)
    setJobs((prev) => prev.filter((j) => j.id !== id))
    setUpdatingId(null)
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!form.position.trim() || !form.company.trim()) {
      setError('Posição e empresa são obrigatórios.')
      return
    }
    setSaving(true)
    setError(null)

    const { data: newJob, error: err } = await supabase
      .from('jobs')
      .insert({
        position:  form.position.trim(),
        company:   form.company.trim(),
        category:  form.category,
        location:  form.location.trim() || null,
        job_type:  form.job_type.trim() || null,
        work_mode: form.work_mode || null,
        is_active: true,
      })
      .select('id, position, company, location, job_type, work_mode, category, is_active, created_at')
      .single()

    if (err || !newJob) {
      setError('Erro ao criar oportunidade. Verifique os campos e tente novamente.')
      setSaving(false)
      return
    }

    const rawTags = form.tags.split(',').map((t) => t.trim()).filter(Boolean)
    if (rawTags.length > 0) {
      await supabase.from('job_tags').insert(rawTags.map((tag_name) => ({ job_id: newJob.id, tag_name })))
    }

    setJobs((prev) => [{ ...newJob, job_tags: rawTags.map((t) => ({ tag_name: t })) } as Job, ...prev])
    setForm(EMPTY_FORM)
    setShowForm(false)
    setSaving(false)
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
          <h1 className="text-2xl font-semibold text-zinc-900">Oportunidades</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {pendingCount > 0 ? `${pendingCount} aguardando aprovação` : `${jobs.length} oportunidades cadastradas`}
          </p>
        </div>
        <div className="flex items-center gap-3">
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
          <button
            onClick={() => { setShowForm(true); setError(null) }}
            className="flex items-center gap-2 rounded-xl bg-[#2F9E41] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition"
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <line x1={12} y1={5} x2={12} y2={19} /><line x1={5} y1={12} x2={19} y2={12} />
            </svg>
            Nova oportunidade
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-zinc-900">Nova oportunidade</h2>
              <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-zinc-700 transition">
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <line x1={18} y1={6} x2={6} y2={18} /><line x1={6} y1={6} x2={18} y2={18} />
                </svg>
              </button>
            </div>
            <form onSubmit={create} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-xs font-semibold text-zinc-600">Posição / Cargo <span className="text-red-500">*</span></label>
                  <input
                    value={form.position}
                    onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                    placeholder="Ex: Desenvolvedor Júnior"
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#2F9E41] transition"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-600">Empresa <span className="text-red-500">*</span></label>
                  <input
                    value={form.company}
                    onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                    placeholder="Ex: Empresa XYZ"
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#2F9E41] transition"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-600">Categoria</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#2F9E41] transition bg-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-600">Localização</label>
                  <input
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="Ex: São Paulo, SP"
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#2F9E41] transition"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-600">Tipo</label>
                  <input
                    value={form.job_type}
                    onChange={(e) => setForm((f) => ({ ...f, job_type: e.target.value }))}
                    placeholder="Ex: CLT, PJ, Bolsa IC"
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#2F9E41] transition"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-600">Modalidade</label>
                  <select
                    value={form.work_mode}
                    onChange={(e) => setForm((f) => ({ ...f, work_mode: e.target.value }))}
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#2F9E41] transition bg-white"
                  >
                    <option value="">— selecionar —</option>
                    {WORK_MODES.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-xs font-semibold text-zinc-600">Tags <span className="text-zinc-400 font-normal">(separadas por vírgula)</span></label>
                  <input
                    value={form.tags}
                    onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                    placeholder="Ex: React, Node.js, Python"
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#2F9E41] transition"
                  />
                </div>
              </div>

              {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-600 border border-zinc-200 hover:bg-zinc-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-[#2F9E41] hover:opacity-90 disabled:opacity-50 transition"
                >
                  {saving ? 'Salvando…' : 'Publicar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">Nenhuma oportunidade {filter === 'todas' ? 'cadastrada' : filter}.</div>
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
                <button
                  onClick={() => remove(job.id)}
                  disabled={updatingId === job.id}
                  className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-50 transition"
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
