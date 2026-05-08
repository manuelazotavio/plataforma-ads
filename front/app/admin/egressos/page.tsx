'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'

type Egresso = {
  id: string
  name: string
  avatar_url: string | null
  graduation_year: number | null
  role: string | null
  company: string | null
  linkedin: string | null
  bio: string | null
  is_active: boolean
  display_order: number
}

const empty = (): Omit<Egresso, 'id'> => ({
  name: '',
  avatar_url: '',
  graduation_year: null,
  role: '',
  company: '',
  linkedin: '',
  bio: '',
  is_active: true,
  display_order: 0,
})

export default function AdminEgressosPage() {
  const [egressos, setEgressos] = useState<Egresso[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Egresso | null>(null)
  const [form, setForm] = useState(empty())
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    const { data } = await supabase
      .from('egressos')
      .select('*')
      .order('display_order', { ascending: true })
    setEgressos((data as Egresso[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { void Promise.resolve().then(load) }, [])

  function openCreate() {
    setEditing(null)
    setForm(empty())
    setSubmitted(false)
    setError(null)
    setShowForm(true)
  }

  function openEdit(egresso: Egresso) {
    setEditing(egresso)
    setForm({ ...egresso })
    setSubmitted(false)
    setError(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setForm(empty())
    setSubmitted(false)
    setError(null)
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    setError(null)

    const ext = file.name.split('.').pop()
    const path = `egressos/${editing?.id ?? crypto.randomUUID()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })

    if (uploadError) {
      setError('Erro ao enviar imagem: ' + uploadError.message)
      setUploadingAvatar(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    setForm((prev) => ({ ...prev, avatar_url: publicUrl }))
    setUploadingAvatar(false)
    e.target.value = ''
  }

  async function save() {
    setSubmitted(true)
    if (!form.name.trim()) return
    setSaving(true)
    setError(null)
    const payload = {
      name: form.name,
      avatar_url: form.avatar_url || null,
      graduation_year: form.graduation_year || null,
      role: form.role || null,
      company: form.company || null,
      linkedin: form.linkedin || null,
      bio: form.bio || null,
      is_active: form.is_active,
      display_order: form.display_order,
    }
    if (editing) {
      const { error: updateError } = await supabase.from('egressos').update(payload).eq('id', editing.id)
      if (updateError) {
        setError('Erro ao salvar egresso: ' + updateError.message)
        setSaving(false)
        return
      }
    } else {
      const { error: insertError } = await supabase.from('egressos').insert(payload)
      if (insertError) {
        setError('Erro ao salvar egresso: ' + insertError.message)
        setSaving(false)
        return
      }
    }
    await load()
    closeForm()
    setSaving(false)
  }

  async function toggleActive(id: string, value: boolean) {
    await supabase.from('egressos').update({ is_active: value }).eq('id', id)
    setEgressos((prev) => prev.map((e) => e.id === id ? { ...e, is_active: value } : e))
  }

  async function deleteEgresso(id: string) {
    if (!confirm('Remover este egresso?')) return
    setDeletingId(id)
    await supabase.from('egressos').delete().eq('id', id)
    setEgressos((prev) => prev.filter((e) => e.id !== id))
    setDeletingId(null)
  }

  if (loading) return <p className="text-sm text-zinc-500">Carregando...</p>

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Egressos</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{egressos.length} cadastrado{egressos.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition sm:w-auto"
          style={{ backgroundColor: '#2F9E41' }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          Novo egresso
        </button>
      </div>

      

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-4 sm:items-center">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col gap-5 overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-7">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">
                {editing ? 'Editar egresso' : 'Novo egresso'}
              </h2>
              <button onClick={closeForm} className="text-zinc-400 hover:text-zinc-700 text-xl leading-none">×</button>
            </div>

            <div className="flex flex-col gap-4">
              <Field label="Nome" required>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={submitted && !form.name.trim() ? inputError : input} placeholder="Nome completo" />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Ano de formatura">
                  <input
                    type="number"
                    value={form.graduation_year ?? ''}
                    onChange={(e) => setForm({ ...form, graduation_year: e.target.value ? parseInt(e.target.value) : null })}
                    className={input}
                    placeholder="2024"
                  />
                </Field>
                <Field label="Ordem de exibição">
                  <input
                    type="number"
                    value={form.display_order}
                    onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
                    className={input}
                  />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Cargo atual">
                  <input value={form.role ?? ''} onChange={(e) => setForm({ ...form, role: e.target.value })} className={input} placeholder="Ex: Dev Frontend" />
                </Field>
                <Field label="Empresa">
                  <input value={form.company ?? ''} onChange={(e) => setForm({ ...form, company: e.target.value })} className={input} placeholder="Ex: Google" />
                </Field>
              </div>

              <Field label="LinkedIn">
                <input value={form.linkedin ?? ''} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} className={input} placeholder="https://linkedin.com/in/..." />
              </Field>

              <Field label="Foto">
                <div className="flex items-center gap-4">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
                    {form.avatar_url ? (
                      <Image src={form.avatar_url} alt={form.name || 'Foto do egresso'} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-zinc-300">
                        {form.name ? form.name.charAt(0).toUpperCase() : '?'}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {uploadingAvatar ? 'Enviando...' : 'Trocar foto'}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </div>
              </Field>

              <Field label="Bio">
                <textarea value={form.bio ?? ''} onChange={(e) => setForm({ ...form, bio: e.target.value })} className={`${input} resize-none h-20`} placeholder="Breve descrição..." />
              </Field>

              <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4.5 h-4.5 accent-[#2F9E41]" />
                Visível na plataforma
              </label>
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
            )}

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
              <button
                onClick={save}
                disabled={saving || uploadingAvatar || !form.name.trim()}
                className="flex-1 rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-50 transition"
                style={{ backgroundColor: '#2F9E41' }}
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={closeForm} className="rounded-lg border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      
      {egressos.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">Nenhum egresso cadastrado.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {egressos.map((egresso) => (
            <div key={egresso.id} className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-900">{egresso.name}</p>
                <p className="text-xs text-zinc-400">
                  {egresso.graduation_year && `Turma ${egresso.graduation_year}`}
                  {egresso.graduation_year && (egresso.role || egresso.company) && ' · '}
                  {egresso.role}{egresso.role && egresso.company ? ' @ ' : ''}{egresso.company}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-1.5 sm:flex sm:shrink-0">
                <button onClick={() => openEdit(egresso)} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition">
                  Editar
                </button>
                <button onClick={() => toggleActive(egresso.id, !egresso.is_active)} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition">
                  {egresso.is_active ? 'Ocultar' : 'Publicar'}
                </button>
                <button onClick={() => deleteEgresso(egresso.id)} disabled={deletingId === egresso.id} className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-50 transition">
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
