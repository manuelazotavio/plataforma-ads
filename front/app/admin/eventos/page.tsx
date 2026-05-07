'use client'

import { useEffect, useState } from 'react'
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

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('start_date', { ascending: false })
    setEvents((data as Event[]) ?? [])
    setLoading(false)
  }

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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Eventos</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{events.length} evento{events.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition"
          style={{ backgroundColor: '#2F9E41' }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          Novo evento
        </button>
      </div>

      
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl p-7 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
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

              <div className="grid grid-cols-2 gap-3">
                <Field label="Edição">
                  <input
                    value={form.edition ?? ''}
                    onChange={(e) => setForm({ ...form, edition: e.target.value })}
                    className={input}
                    placeholder="Ex: 3ª edição"
                  />
                </Field>
                <Field label="Categoria">
                  <div className="relative">
                    <select
                      value={form.category ?? ''}
                      onChange={(e) => setForm({ ...form, category: e.target.value || null })}
                      className={`${input} appearance-none bg-white pr-9 cursor-pointer`}
                    >
                      <option value="">Sem categoria</option>
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
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

              <div className="grid grid-cols-2 gap-3">
                <Field label="Data de início">
                  <input
                    type="date"
                    value={form.start_date ?? ''}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className={input}
                  />
                </Field>
                <Field label="Data de encerramento">
                  <input
                    type="date"
                    value={form.end_date ?? ''}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
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

              <div className="flex gap-6">
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

            <div className="flex gap-2 pt-2">
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
            <div key={event.id} className="bg-white rounded-2xl border border-zinc-200 p-5 flex gap-4 items-start">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {event.category && (
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#2F9E41]">
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
                <div className="flex gap-2 mt-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${event.is_active ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                    {event.is_active ? 'publicado' : 'oculto'}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${event.registration_open ? 'bg-blue-100 text-blue-700' : 'bg-zinc-100 text-zinc-500'}`}>
                    inscrições {event.registration_open ? 'abertas' : 'encerradas'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 shrink-0">
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
