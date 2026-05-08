'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'
import { getAuthUser } from '@/app/lib/auth'

type Professor = {
  id: string
  name: string
  cargo: string | null
  years_at_if: number | null
  bio: string | null
  avatar_url: string | null
  email: string | null
  whatsapp: string | null
  linkedin: string | null
  cnpq: string | null
  is_active: boolean
  display_order: number
  user_id: string | null
}

const EMPTY_FORM = {
  name: '',
  cargo: '',
  years_at_if: '',
  bio: '',
  email: '',
  whatsapp: '',
  linkedin: '',
  cnpq: '',
  is_active: true,
  display_order: '0',
}

export default function AdminCorpoDocentePage() {
  const router = useRouter()
  const [professors, setProfessors] = useState<Professor[]>([])
  const [loading, setLoading] = useState(true)

  
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [creating, setCreating] = useState(false)
  const [submitted, setSubmitted] = useState(false)


  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<typeof EMPTY_FORM | null>(null)
  const [saving, setSaving] = useState(false)
  const [editSubmitted, setEditSubmitted] = useState(false)

  
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const targetProfId = useRef<string | null>(null)

  const [accessFormId, setAccessFormId] = useState<string | null>(null)
  const [accessForm, setAccessForm] = useState({ email: '', password: '' })
  const [accessSaving, setAccessSaving] = useState(false)
  const [accessError, setAccessError] = useState<string | null>(null)

  async function loadProfessors() {
    const { data } = await supabase
      .from('professors')
      .select('*')
      .order('display_order', { ascending: true })
    setProfessors(data ?? [])
  }

  useEffect(() => {
    async function load() {
      const user = await getAuthUser()
      if (!user) { router.push('/login'); return }

      const { data: me, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Erro ao buscar role:', error)
        alert(`Erro ao verificar permissões: ${error.message}`)
        return
      }

      if (me?.role !== 'admin') {
        alert(`Acesso negado. Seu role atual é: "${me?.role}". Esperado: "admin".`)
        router.push('/')
        return
      }

      await loadProfessors()
      setLoading(false)
    }
    load()
  }, [router])

  async function handleCreate() {
    setSubmitted(true)
    if (!form.name.trim()) return
    setCreating(true)

    await supabase.from('professors').insert({
      name: form.name,
      cargo: form.cargo || null,
      years_at_if: form.years_at_if ? parseInt(form.years_at_if) : null,
      bio: form.bio || null,
      email: form.email || null,
      whatsapp: form.whatsapp || null,
      linkedin: form.linkedin || null,
      cnpq: form.cnpq || null,
      is_active: form.is_active,
      display_order: parseInt(form.display_order) || professors.length,
    })

    setForm(EMPTY_FORM)
    setSubmitted(false)
    setShowForm(false)
    await loadProfessors()
    setCreating(false)
  }

  function startEdit(prof: Professor) {
    setEditSubmitted(false)
    setEditingId(prof.id)
    setEditState({
      name: prof.name,
      cargo: prof.cargo ?? '',
      years_at_if: prof.years_at_if?.toString() ?? '',
      bio: prof.bio ?? '',
      email: prof.email ?? '',
      whatsapp: prof.whatsapp ?? '',
      linkedin: prof.linkedin ?? '',
      cnpq: prof.cnpq ?? '',
      is_active: prof.is_active,
      display_order: prof.display_order?.toString() ?? '0',
    })
  }

  async function saveEdit(id: string) {
    if (!editState) return
    setEditSubmitted(true)
    if (!editState.name.trim()) return
    setSaving(true)

    await supabase.from('professors').update({
      name: editState.name,
      cargo: editState.cargo || null,
      years_at_if: editState.years_at_if ? parseInt(editState.years_at_if) : null,
      bio: editState.bio || null,
      email: editState.email || null,
      whatsapp: editState.whatsapp || null,
      linkedin: editState.linkedin || null,
      cnpq: editState.cnpq || null,
      is_active: editState.is_active,
      display_order: parseInt(editState.display_order) || 0,
      updated_at: new Date().toISOString(),
    }).eq('id', id)

    await loadProfessors()
    setEditingId(null)
    setEditState(null)
    setEditSubmitted(false)
    setSaving(false)
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const profId = targetProfId.current
    if (!file || !profId) return

    setUploadingId(profId)
    const ext = file.name.split('.').pop()
    const path = `professors/${profId}.${ext}`

    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.from('professors').update({ avatar_url: publicUrl }).eq('id', profId)
      setProfessors((prev) => prev.map((p) => p.id === profId ? { ...p, avatar_url: publicUrl } : p))
    }

    setUploadingId(null)
    e.target.value = ''
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir "${name}"?`)) return
    await supabase.from('professors').delete().eq('id', id)
    setProfessors((prev) => prev.filter((p) => p.id !== id))
  }

  function openAccessForm(profId: string) {
    setAccessFormId(profId)
    setAccessForm({ email: '', password: '' })
    setAccessError(null)
  }

  async function createAccess(profId: string) {
    if (!accessForm.email.trim() || !accessForm.password.trim()) {
      setAccessError('Preencha e-mail e senha.')
      return
    }
    setAccessSaving(true)
    setAccessError(null)
    const { data, error } = await supabase.functions.invoke('create-professor-user', {
      body: { professor_id: profId, email: accessForm.email.trim(), password: accessForm.password },
    })
    if (error || data?.error) {
      setAccessError(data?.error ?? error?.message ?? 'Erro ao criar acesso.')
      setAccessSaving(false)
      return
    }
    setProfessors((prev) => prev.map((p) => p.id === profId ? { ...p, user_id: data.user_id } : p))
    setAccessFormId(null)
    setAccessSaving(false)
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Carregando...</p>
  }

  return (
    <div className="mx-auto max-w-3xl">

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Corpo Docente</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{professors.length} professor{professors.length !== 1 ? 'es' : ''}</p>
          </div>
          <button
            onClick={() => { if (showForm) { setForm(EMPTY_FORM); setSubmitted(false) } setShowForm((v) => !v) }}
            className="w-full rounded-lg bg-[#2F9E41] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition sm:w-auto"
          >
            {showForm ? 'Cancelar' : 'Adicionar professor'}
          </button>
        </div>

       
        {showForm && (
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-6">
            <h2 className="text-sm font-semibold text-zinc-900 mb-4">Novo professor</h2>
            <div className="flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nome" required>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={submitted && !form.name.trim() ? inputErrorClass : inputClass} placeholder="Nome completo" />
                </Field>
                <Field label="Cargo">
                  <input type="text" value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} className={inputClass} placeholder="Ex: Professor Efetivo" />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Anos no IF">
                  <input type="number" min={0} value={form.years_at_if} onChange={(e) => setForm({ ...form, years_at_if: e.target.value })} className={inputClass} placeholder="Ex: 8" />
                </Field>
                <Field label="Ordem de exibição">
                  <input type="number" min={0} value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} className={inputClass} />
                </Field>
              </div>
              <Field label="Bio">
                <textarea rows={2} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className={inputClass + ' resize-none'} placeholder="Especialidade, formação..." />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="E-mail de contato">
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} placeholder="prof@email.com" />
                </Field>
                <Field label="WhatsApp (com DDD)">
                  <input type="text" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className={inputClass} placeholder="Ex: 5511999999999" />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="LinkedIn">
                  <input type="url" value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} className={inputClass} placeholder="https://linkedin.com/in/..." />
                </Field>
                <Field label="CNPq (URL do currículo)">
                  <input type="url" value={form.cnpq} onChange={(e) => setForm({ ...form, cnpq: e.target.value })} className={inputClass} placeholder="http://lattes.cnpq.br/..." />
                </Field>
              </div>
              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4.5 h-4.5 accent-[#2F9E41]" />
                  Visível na página pública
                </label>
                <button
                  onClick={handleCreate}
                  disabled={creating || !form.name.trim()}
                  className="rounded-lg bg-[#2F9E41] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition"
                >
                  {creating ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        )}

        
        {professors.length === 0 ? (
          <div className="text-center py-16 text-zinc-400">Nenhum professor cadastrado.</div>
        ) : (
          <div className="flex flex-col gap-4">
            {professors.map((prof) => (
              <div key={prof.id} className="bg-white rounded-2xl border border-zinc-200 p-5">
                <div className="flex flex-col gap-4 sm:flex-row">

                 
                  <div className="flex shrink-0 flex-col items-start gap-1 sm:items-center">
                    <div className="relative w-16 h-16 rounded-full overflow-hidden bg-zinc-100 border border-zinc-200">
                      {prof.avatar_url ? (
                        <Image src={prof.avatar_url} alt={prof.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-300 text-xl font-medium">
                          {prof.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <button
                      disabled={uploadingId === prof.id}
                      onClick={() => { targetProfId.current = prof.id; fileInputRef.current?.click() }}
                      className="text-xs text-zinc-400 hover:text-zinc-700 disabled:opacity-50 transition"
                    >
                      {uploadingId === prof.id ? 'Enviando...' : 'Trocar foto'}
                    </button>
                  </div>

                  
                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">{prof.name}</p>
                        {prof.cargo && <p className="text-xs text-zinc-500">{prof.cargo}</p>}
                        {prof.years_at_if != null && prof.years_at_if > 0 && (
                          <p className="text-xs text-zinc-400">{prof.years_at_if} anos no IF</p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 sm:shrink-0">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${prof.is_active ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                          {prof.is_active ? 'visível' : 'oculto'}
                        </span>
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                          #{prof.display_order}
                        </span>
                      </div>
                    </div>
                    {prof.bio && <p className="text-xs text-zinc-400 line-clamp-2">{prof.bio}</p>}
                  </div>
                </div>

                
                {editingId === prof.id && editState ? (
                  <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-col gap-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Nome" required>
                        <input type="text" value={editState.name} onChange={(e) => setEditState({ ...editState, name: e.target.value })} className={editSubmitted && !editState.name.trim() ? inputErrorClass : inputClass} />
                      </Field>
                      <Field label="Cargo">
                        <input type="text" value={editState.cargo} onChange={(e) => setEditState({ ...editState, cargo: e.target.value })} className={inputClass} placeholder="Ex: Professor Efetivo" />
                      </Field>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Anos no IF">
                        <input type="number" min={0} value={editState.years_at_if} onChange={(e) => setEditState({ ...editState, years_at_if: e.target.value })} className={inputClass} />
                      </Field>
                      <Field label="Ordem">
                        <input type="number" min={0} value={editState.display_order} onChange={(e) => setEditState({ ...editState, display_order: e.target.value })} className={inputClass} />
                      </Field>
                    </div>
                    <Field label="Bio">
                      <textarea rows={2} value={editState.bio} onChange={(e) => setEditState({ ...editState, bio: e.target.value })} className={inputClass + ' resize-none'} />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="E-mail de contato">
                        <input type="email" value={editState.email} onChange={(e) => setEditState({ ...editState, email: e.target.value })} className={inputClass} placeholder="prof@email.com" />
                      </Field>
                      <Field label="WhatsApp (com DDD)">
                        <input type="text" value={editState.whatsapp} onChange={(e) => setEditState({ ...editState, whatsapp: e.target.value })} className={inputClass} placeholder="Ex: 5511999999999" />
                      </Field>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="LinkedIn">
                        <input type="url" value={editState.linkedin} onChange={(e) => setEditState({ ...editState, linkedin: e.target.value })} className={inputClass} placeholder="https://linkedin.com/in/..." />
                      </Field>
                      <Field label="CNPq (URL do currículo)">
                        <input type="url" value={editState.cnpq} onChange={(e) => setEditState({ ...editState, cnpq: e.target.value })} className={inputClass} placeholder="http://lattes.cnpq.br/..." />
                      </Field>
                    </div>
                    <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                      <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
                        <input type="checkbox" checked={editState.is_active} onChange={(e) => setEditState({ ...editState, is_active: e.target.checked })} className="w-4.5 h-4.5 accent-[#2F9E41]" />
                        Visível na página pública
                      </label>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingId(null); setEditState(null); setEditSubmitted(false) }} className="text-sm text-zinc-500 hover:text-zinc-900 transition px-3 py-1.5">
                          Cancelar
                        </button>
                        <button onClick={() => saveEdit(prof.id)} disabled={saving} className="rounded-lg bg-[#2F9E41] px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition">
                          {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 border-t border-zinc-100 pt-3 flex flex-col gap-3">
                    {prof.user_id ? (
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                        <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                          Acesso vinculado
                        </span>
                        <span className="text-xs text-zinc-400">O professor pode fazer login e editar o próprio perfil.</span>
                      </div>
                    ) : accessFormId === prof.id ? (
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-medium text-zinc-700">Criar acesso de login para este professor</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            type="email"
                            placeholder="E-mail"
                            value={accessForm.email}
                            onChange={(e) => setAccessForm((f) => ({ ...f, email: e.target.value }))}
                            className={inputClass}
                          />
                          <input
                            type="password"
                            placeholder="Senha inicial"
                            value={accessForm.password}
                            onChange={(e) => setAccessForm((f) => ({ ...f, password: e.target.value }))}
                            className={inputClass}
                          />
                        </div>
                        {accessError && <p className="text-xs text-red-600">{accessError}</p>}
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button
                            onClick={() => createAccess(prof.id)}
                            disabled={accessSaving}
                            className="rounded-lg bg-[#2F9E41] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 transition"
                          >
                            {accessSaving ? 'Criando...' : 'Criar acesso'}
                          </button>
                          <button
                            onClick={() => setAccessFormId(null)}
                            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => openAccessForm(prof.id)}
                        className="self-start rounded-lg border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-50 transition"
                      >
                        Criar acesso de login
                      </button>
                    )}

                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(prof)} className="rounded-lg border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition">
                        Editar
                      </button>
                      <button onClick={() => handleDelete(prof.id, prof.name)} className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition">
                        Excluir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
    </div>
  )
}

const inputClass = 'rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 transition w-full'

const inputErrorClass = 'rounded-lg border border-red-400 bg-red-50/30 px-3 py-2 text-xs text-zinc-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition w-full'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-zinc-600">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
