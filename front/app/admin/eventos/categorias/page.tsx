'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

type Category = {
  id: string
  value: string
  label: string
  order: number
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

const emptyForm = () => ({ value: '', label: '' })

export default function AdminEventosCategorias() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const { data } = await supabase
      .from('event_categories')
      .select('*')
      .order('order', { ascending: true })
    setCategories((data as Category[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { void Promise.resolve().then(load) }, [])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm())
    setSubmitted(false)
    setError(null)
    setShowForm(true)
  }

  function openEdit(cat: Category) {
    setEditing(cat)
    setForm({ value: cat.value, label: cat.label })
    setSubmitted(false)
    setError(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setForm(emptyForm())
    setSubmitted(false)
    setError(null)
  }

  function handleLabelChange(label: string) {
    setForm((f) => ({
      label,
      value: editing ? f.value : slugify(label),
    }))
  }

  async function save() {
    setSubmitted(true)
    if (!form.label.trim() || !form.value.trim()) return
    setSaving(true)
    setError(null)

    const nextOrder = categories.length > 0
      ? Math.max(...categories.map((c) => c.order)) + 1
      : 0

    if (editing) {
      const { error: err } = await supabase
        .from('event_categories')
        .update({ label: form.label.trim() })
        .eq('id', editing.id)
      if (err) { setError('Erro ao salvar: ' + err.message); setSaving(false); return }
    } else {
      const { error: err } = await supabase
        .from('event_categories')
        .insert({ value: form.value.trim(), label: form.label.trim(), order: nextOrder })
      if (err) {
        setError(err.message.includes('unique') ? 'Já existe uma categoria com esse identificador.' : 'Erro ao salvar: ' + err.message)
        setSaving(false)
        return
      }
    }

    await load()
    closeForm()
    setSaving(false)
  }

  async function deleteCategory(cat: Category) {
    const { count } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('category', cat.value)

    if ((count ?? 0) > 0) {
      const ok = confirm(
        `A categoria "${cat.label}" está sendo usada em ${count} evento(s).\nAo remover, esses eventos ficarão sem categoria. Deseja continuar?`
      )
      if (!ok) return
    } else {
      if (!confirm(`Remover a categoria "${cat.label}"?`)) return
    }

    setDeletingId(cat.id)
    await supabase.from('event_categories').delete().eq('id', cat.id)
    setCategories((prev) => prev.filter((c) => c.id !== cat.id))
    setDeletingId(null)
  }

  async function moveOrder(cat: Category, dir: -1 | 1) {
    const sorted = [...categories].sort((a, b) => a.order - b.order)
    const idx = sorted.findIndex((c) => c.id === cat.id)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= sorted.length) return

    const a = sorted[idx]
    const b = sorted[swapIdx]
    await Promise.all([
      supabase.from('event_categories').update({ order: b.order }).eq('id', a.id),
      supabase.from('event_categories').update({ order: a.order }).eq('id', b.id),
    ])
    await load()
  }

  if (loading) return <p className="text-sm text-zinc-500">Carregando...</p>

  return (
    <div>
      <div className="mb-2">
        <Link
          href="/admin/eventos"
          className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition mb-4"
        >
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          Eventos
        </Link>
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Categorias de eventos</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{categories.length} categoria{categories.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition sm:w-auto"
          style={{ backgroundColor: '#2F9E41' }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          Nova categoria
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-zinc-900">
                {editing ? 'Editar categoria' : 'Nova categoria'}
              </h2>
              <button onClick={closeForm} className="text-zinc-400 hover:text-zinc-700 text-xl leading-none">×</button>
            </div>

            <div className="flex flex-col gap-4">
              <Field label="Nome" required>
                <input
                  value={form.label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  className={submitted && !form.label.trim() ? inputError : input}
                  placeholder="Ex: Hackathon"
                  autoFocus
                />
              </Field>

              <Field label="Identificador" required>
                <input
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: slugify(e.target.value) }))}
                  className={`${submitted && !form.value.trim() ? inputError : input} font-mono ${editing ? 'bg-zinc-50 text-zinc-400 cursor-not-allowed' : ''}`}
                  placeholder="ex: hackathon"
                  disabled={!!editing}
                  readOnly={!!editing}
                />
                {!editing && (
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Gerado automaticamente a partir do nome. Não pode ser alterado após criar.
                  </p>
                )}
              </Field>

              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>

            <div className="flex flex-col-reverse gap-2 pt-5 sm:flex-row">
              <button
                onClick={save}
                disabled={saving}
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

      {categories.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">Nenhuma categoria cadastrada.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {[...categories].sort((a, b) => a.order - b.order).map((cat, idx, arr) => (
            <div
              key={cat.id}
              className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3"
            >
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveOrder(cat, -1)}
                  disabled={idx === 0}
                  className="text-zinc-300 hover:text-zinc-600 disabled:opacity-0 transition leading-none"
                  aria-label="Mover para cima"
                >
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                </button>
                <button
                  onClick={() => moveOrder(cat, 1)}
                  disabled={idx === arr.length - 1}
                  className="text-zinc-300 hover:text-zinc-600 disabled:opacity-0 transition leading-none"
                  aria-label="Mover para baixo"
                >
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-900">{cat.label}</p>
                <p className="text-xs font-mono text-zinc-400">{cat.value}</p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => openEdit(cat)}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition"
                >
                  Editar
                </button>
                <button
                  onClick={() => deleteCategory(cat)}
                  disabled={deletingId === cat.id}
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
const inputError = 'w-full rounded-lg border border-red-400 bg-red-50/30 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-red-400 transition'

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
