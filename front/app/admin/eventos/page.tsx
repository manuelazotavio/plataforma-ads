'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import Select from '@/app/components/Select'
import DatePicker from '@/app/components/DatePicker'
import { supabase } from '@/app/lib/supabase'

type Category = {
  id: string
  value: string
  label: string
  order: number
}

type Event = {
  id: string
  title: string
  edition: string | null
  category: string | null
  description: string | null
  start_date: string | null
  end_date: string | null
  registration_url: string | null
  registration_open: boolean | null
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
  registration_open: null,
  banner_url: '',
  is_active: true,
})

export default function AdminEventosPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Event | null>(null)
  const [form, setForm] = useState(empty())
  const [saving, setSaving] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [draggingBanner, setDraggingBanner] = useState(false)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    const [{ data: eventsData }, { data: catsData }] = await Promise.all([
      supabase.from('events').select('*').order('start_date', { ascending: false }),
      supabase.from('event_categories').select('*').order('order', { ascending: true }),
    ])
    setEvents((eventsData as Event[]) ?? [])
    setCategories((catsData as Category[]) ?? [])
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

  async function handleBannerDrop(e: React.DragEvent) {
    e.preventDefault()
    setDraggingBanner(false)
    const file = e.dataTransfer.files?.[0]
    if (file?.type.startsWith('image/')) await uploadBannerFile(file)
  }

  async function handleBannerPaste(e: React.ClipboardEvent) {
    const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith('image/'))
    if (file) await uploadBannerFile(file)
  }

  async function uploadBannerFile(file: File) {
    setUploadingBanner(true)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `eventos/evento-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('covers').upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type,
    })
    if (error) { alert('Erro ao enviar imagem: ' + error.message); setUploadingBanner(false); return }
    const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(path)
    setForm((current) => ({ ...current, banner_url: publicUrl }))
    setUploadingBanner(false)
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
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Link
            href="/admin/eventos/categorias"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 sm:flex-none"
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 10h16M4 14h10M4 18h6"/></svg>
            Categorias
          </Link>
          <button
            onClick={openCreate}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition sm:flex-none"
            style={{ backgroundColor: '#2F9E41' }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            Novo evento
          </button>
        </div>
      </div>

      
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-4 sm:items-center">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-5 overflow-y-auto overflow-x-hidden rounded-2xl bg-white p-4 shadow-xl sm:p-7">
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

              <div className="grid gap-3 md:grid-cols-2">
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
                    options={categories}
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

              <div className="grid gap-3 md:grid-cols-2">
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

              <Field label="Foto do evento">
                <div
                  onDragOver={(e) => { e.preventDefault(); setDraggingBanner(true) }}
                  onDragLeave={() => setDraggingBanner(false)}
                  onDrop={handleBannerDrop}
                  onPaste={handleBannerPaste}
                  tabIndex={0}
                  className={`relative overflow-hidden rounded-xl border-2 transition outline-none focus-visible:ring-2 focus-visible:ring-[#2F9E41]/40 ${
                    form.banner_url
                      ? 'border-transparent'
                      : draggingBanner
                      ? 'border-[#2F9E41] bg-[#2F9E41]/5'
                      : 'border-dashed border-zinc-300 bg-zinc-50 hover:border-zinc-400'
                  }`}
                >
                  {form.banner_url ? (
                    <div className="group relative aspect-video bg-zinc-100">
                      <img src={form.banner_url} alt="Banner do evento" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => bannerInputRef.current?.click()}
                          disabled={uploadingBanner}
                          className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-50"
                        >
                          Trocar foto
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, banner_url: '' })}
                          disabled={uploadingBanner}
                          className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
                        >
                          Remover
                        </button>
                      </div>
                      {uploadingBanner && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <span className="text-sm font-medium text-white">Enviando...</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      disabled={uploadingBanner}
                      className="flex aspect-video w-full flex-col items-center justify-center gap-2 text-zinc-400 transition hover:text-zinc-600 disabled:opacity-50"
                    >
                      <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="m21 15-5-5L5 21" />
                      </svg>
                      <div className="text-center">
                        <p className="text-sm font-medium">{uploadingBanner ? 'Enviando...' : 'Clique para adicionar'}</p>
                        <p className="text-xs">ou arraste e solte · cole com Ctrl+V</p>
                      </div>
                    </button>
                  )}
                </div>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void uploadBannerFile(f) }}
                />
              </Field>

              <div className="flex flex-col gap-4">
                <Field label="Status das inscrições">
                  <div className="flex flex-wrap gap-2">
                    {([
                      { value: null, label: 'Não iniciado' },
                      { value: true, label: 'Abertas' },
                      { value: false, label: 'Encerradas' },
                    ] as const).map(({ value, label }) => (
                      <button
                        key={String(value)}
                        type="button"
                        onClick={() => setForm({ ...form, registration_open: value })}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                          form.registration_open === value
                            ? 'border-[#2F9E41] bg-[#2F9E41]/10 text-[#2F9E41]'
                            : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>
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
                      {categories.find((c) => c.value === event.category)?.label ?? event.category}
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
                  <span className={`inline-flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-[11px] font-semibold ${
                    event.registration_open === true ? 'border-blue-200 text-blue-700' :
                    event.registration_open === null ? 'border-amber-200 text-amber-700' :
                    'border-zinc-200 text-zinc-500'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      event.registration_open === true ? 'bg-blue-500' :
                      event.registration_open === null ? 'bg-amber-400' :
                      'bg-zinc-400'
                    }`} />
                    {event.registration_open === true ? 'Inscrições Abertas' :
                     event.registration_open === null ? 'Não iniciado' :
                     'Inscrições Encerradas'}
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
