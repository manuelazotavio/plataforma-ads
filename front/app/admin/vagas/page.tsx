'use client'

import { useEffect, useState } from 'react'
import Select from '@/app/components/Select'
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
  application_url: string | null
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
  application_url: '',
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

  async function load() {
    const { data } = await supabase
      .from('jobs')
      .select('id, position, company, location, job_type, work_mode, application_url, category, is_active, created_at, job_tags(tag_name)')
      .order('created_at', { ascending: false })
    setJobs((data as Job[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void Promise.resolve().then(load)
  }, [])

  async function toggle(id: string, value: boolean) {
    setUpdatingId(id)
    await supabase.from('jobs').update({ is_active: value }).eq('id', id)
    setJobs((prev) => prev.map((j) => j.id === id ? { ...j, is_active: value } : j))
    if (value) void sendJobNotificationEmails(id)
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
        application_url: form.application_url.trim() || null,
        is_active: true,
      })
      .select('id, position, company, location, job_type, work_mode, application_url, category, is_active, created_at')
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
    if (newJob.is_active) void sendJobNotificationEmails(newJob.id)
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

  async function sendJobNotificationEmails(jobId: string) {
    const { error: notifyError } = await supabase.functions.invoke('send-job-notifications', {
      body: { job_id: jobId },
    })
    if (notifyError) {
      console.error('Erro ao enviar notificações de oportunidade:', notifyError.message)
    }
  }

  if (loading) return <p className="text-sm text-zinc-500">Carregando...</p>

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Oportunidades</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {pendingCount > 0 ? `${pendingCount} aguardando aprovação` : `${jobs.length} oportunidades cadastradas`}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex w-full gap-1 rounded-lg border border-zinc-200 bg-white p-1 sm:w-auto">
            {(['pendentes', 'ativas', 'todas'] as Filter[]).map((f) => (
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
          <button
            onClick={() => { setShowForm(true); setError(null) }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F9E41] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition sm:w-auto"
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <line x1={12} y1={5} x2={12} y2={19} /><line x1={5} y1={12} x2={19} y2={12} />
            </svg>
            Nova oportunidade
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-zinc-900">Nova oportunidade</h2>
              <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-zinc-700 transition">
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <line x1={18} y1={6} x2={6} y2={18} /><line x1={6} y1={6} x2={18} y2={18} />
                </svg>
              </button>
            </div>
            <form onSubmit={create} className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
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
                  <Select
                    value={form.category}
                    onChange={(value) => setForm((f) => ({ ...f, category: value }))}
                    options={CATEGORIES}
                  />
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
                  <Select
                    value={form.work_mode}
                    onChange={(value) => setForm((f) => ({ ...f, work_mode: value }))}
                    options={WORK_MODES.map((mode) => ({ value: mode, label: mode }))}
                    placeholder="Selecionar"
                  />
                </div>
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-xs font-semibold text-zinc-600">Link da oportunidade</label>
                  <input
                    type="url"
                    value={form.application_url}
                    onChange={(e) => setForm((f) => ({ ...f, application_url: e.target.value }))}
                    placeholder="https://empresa.com/vaga"
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#2F9E41] transition"
                  />
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

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
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
              className={`flex flex-col gap-4 rounded-2xl border bg-white p-4 sm:flex-row ${
                !job.is_active ? 'border-amber-200' : 'border-zinc-200'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
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
                  <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-[11px] font-semibold ${
                    job.is_active ? 'border-green-200 text-green-700' : 'border-amber-200 text-amber-700'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${job.is_active ? 'bg-green-500' : 'bg-amber-500'}`} />
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
                  {job.application_url && (
                    <a href={job.application_url} target="_blank" rel="noopener noreferrer" className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-[#2F9E41] hover:bg-green-100">
                      Link
                    </a>
                  )}
                  {job.job_tags.map(({ tag_name }) => (
                    <span key={tag_name} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">{tag_name}</span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 sm:flex sm:shrink-0 sm:flex-col sm:justify-center">
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
