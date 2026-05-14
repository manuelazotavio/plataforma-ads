'use client'

import { useEffect, useState } from 'react'
import Select from '@/app/components/Select'
import DatePicker from '@/app/components/DatePicker'
import { supabase } from '@/app/lib/supabase'

const CATEGORIES = [
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'maratona', label: 'Maratona' },
  { value: 'extensao', label: 'Extensão' },
  { value: 'iniciacao_cientifica', label: 'Iniciação Científica' },
]

type Event = {
  id: string
  title: string
  edition: string | null
  category: string | null
  description: string | null
  start_date: string | null
  end_date: string | null
  registration_url: string | null
  registration_open: boolean
  banner_url: string | null
  is_active: boolean
}

const empty = (): Omit<Event, 'id'> => ({
  title: '',
  edition: '',
  category: null,
  description: '',
  start_date: '',
  end_date: '',
  registration_url: '',
  registration_open: false,
  banner_url: '',
  is_active: true,
})

export default function AdminEventosPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Event | null>(null)
  const [form, setForm] = useState(empty())
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('start_date', { ascending: false })
    setEvents((data as Event[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { void Promise.resolve().then(load) }, [])

  function openCreate() {
    setEditing(null)
    setForm(empty())
    setShowForm(true)
  }

  function openEdit(event: Event) {
    setEditing(event)
    setForm({ ...event })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setForm(empty())
    setSubmitted(false)
  }

  async function save() {
    setSubmitted(true)
    if (!form.title.trim()) return
    setSaving(true)
    const payload = {
      title: form.title,
      edition: form.edition || null,
      category: form.category || null,
      description: form.description || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      registration_url: form.registration_url || null,
      registration_open: form.registration_open,
      banner_url: form.banner_url || null,
      is_active: form.is_active,
    }
    if (editing) {
      await supabase.from('events').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('events').insert(payload)
    }
    await load()
    closeForm()
    setSaving(false)
  }

  async function toggleField(id: string, field: 'is_active' | 'registration_open', value: boolean) {
    await supabase.from('events').update({ [field]: value }).eq('id', id)
    setEvents((prev) => prev.map((e) => e.id === id ? { ...e, [field]: value } : e))
  }

  async function deleteEvent(id: string) {
    if (!confirm('Remover este evento?')) return
    setDeletingId(id)
    await supabase.from('events').delete().eq('id', id)
    setEvents((prev) => prev.filter((e) => e.id !== id))
    setDeletingId(null)
  }

  if (loading) return <p className="text-sm text-zinc-500">Carregando...</p>

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Eventos</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{events.length} evento{events.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition sm:w-auto"
          style={{ backgroundColor: '#2F9E41' }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          Novo evento
        </button>
      </div>

      
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-4 sm:items-center">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col gap-5 overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-7">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">
                {editing ? 'Editar evento' : 'Novo evento'}
              </h2>
              <button onClick={closeForm} className="text-zinc-400 hover:text-zinc-700 text-xl leading-none">×</button>
            </div>

            <div className="flex flex-col gap-4">
              <Field label="Título" required>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={submitted && !form.title.trim() ? inputError : input}
                  placeholder="Ex: Hackathon ADS 2026"
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Edição">
                  <input
                    value={form.edition ?? ''}
                    onChange={(e) => setForm({ ...form, edition: e.target.value })}
                    className={input}
                    placeholder="Ex: 3ª edição"
                  />
                </Field>
                <Field label="Categoria">
                  <Select
                    value={form.category ?? ''}
                    onChange={(value) => setForm({ ...form, category: value || null })}
                    options={CATEGORIES}
                    placeholder="Sem categoria"
                  />
                </Field>
              </div>

              <Field label="Descrição">
                <textarea
                  value={form.description ?? ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={`${input} resize-none h-24`}
                  placeholder="Descrição do evento..."
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Data de início">
                  <DatePicker
                    value={form.start_date ?? ''}
                    onChange={(val) => setForm({ ...form, start_date: val || null })}
                    placeholder="Selecionar data"
                    className={input}
                  />
                </Field>
                <Field label="Data de encerramento">
                  <DatePicker
                    value={form.end_date ?? ''}
                    onChange={(val) => setForm({ ...form, end_date: val || null })}
                    placeholder="Selecionar data"
                    className={input}
                  />
                </Field>
              </div>

              <Field label="Link de inscrição">
                <input
                  value={form.registration_url ?? ''}
                  onChange={(e) => setForm({ ...form, registration_url: e.target.value })}
                  className={input}
                  placeholder="https://..."
                />
              </Field>

              <Field label="URL do banner">
                <input
                  value={form.banner_url ?? ''}
                  onChange={(e) => setForm({ ...form, banner_url: e.target.value })}
                  className={input}
                  placeholder="https://..."
                />
              </Field>

              <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
                <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.registration_open}
                    onChange={(e) => setForm({ ...form, registration_open: e.target.checked })}
                    className="w-4.5 h-4.5 accent-[#2F9E41]"
                  />
                  Inscrições abertas
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="w-4.5 h-4.5 accent-[#2F9E41]"
                  />
                  Publicado
                </label>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
              <button
                onClick={save}
                disabled={saving || !form.title.trim()}
                className="flex-1 rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-50 transition"
                style={{ backgroundColor: '#2F9E41' }}
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                onClick={closeForm}
                className="rounded-lg border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    
      {events.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">Nenhum evento cadastrado.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((event) => (
            <div key={event.id} className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 sm:flex-row sm:items-start">
              <div className="flex-1 min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  {event.category && (
                    <span className="text-xs font-semibold text-[#2F9E41]">
                      {CATEGORIES.find((c) => c.value === event.category)?.label}
                    </span>
                  )}
                  {event.edition && <span className="text-xs text-zinc-400">{event.edition}</span>}
                </div>
                <p className="text-sm font-semibold text-zinc-900">{event.title}</p>
                {(event.start_date || event.end_date) && (
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {event.start_date && new Date(event.start_date).toLocaleDateString('pt-BR')}
                    {event.end_date && ` – ${new Date(event.end_date).toLocaleDateString('pt-BR')}`}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-[11px] font-semibold ${event.is_active ? 'border-green-200 text-green-700' : 'border-zinc-200 text-zinc-500'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${event.is_active ? 'bg-green-500' : 'bg-zinc-400'}`} />
                    {event.is_active ? 'Publicado' : 'Oculto'}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-[11px] font-semibold ${event.registration_open ? 'border-blue-200 text-blue-700' : 'border-zinc-200 text-zinc-500'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${event.registration_open ? 'bg-blue-500' : 'bg-zinc-400'}`} />
                    Inscrições {event.registration_open ? 'Abertas' : 'Encerradas'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 sm:flex sm:shrink-0 sm:flex-col">
                <button
                  onClick={() => openEdit(event)}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition"
                >
                  Editar
                </button>
                <button
                  onClick={() => toggleField(event.id, 'registration_open', !event.registration_open)}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition"
                >
                  {event.registration_open ? 'Fechar inscrições' : 'Abrir inscrições'}
                </button>
                <button
                  onClick={() => toggleField(event.id, 'is_active', !event.is_active)}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition"
                >
                  {event.is_active ? 'Ocultar' : 'Publicar'}
                </button>
                <button
                  onClick={() => deleteEvent(event.id)}
                  disabled={deletingId === event.id}
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

const input = 'w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 transition'

const inputError = 'w-full rounded-lg border border-red-400 bg-red-50/30 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-zinc-500">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
