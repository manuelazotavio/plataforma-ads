'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

type Category = {
  id: string
  name: string
  description: string | null
  display_order: number
}

export default function AdminForumPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: '', description: '', display_order: 0 })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('forum_categories').select('*').order('display_order')
    setCategories((data as Category[]) ?? [])
    setLoading(false)
  }

  function openCreate() {
    setEditing(null)
    setForm({ name: '', description: '', display_order: 0 })
    setShowForm(true)
  }

  function openEdit(cat: Category) {
    setEditing(cat)
    setForm({ name: cat.name, description: cat.description ?? '', display_order: cat.display_order })
    setShowForm(true)
  }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = { name: form.name, description: form.description || null, display_order: form.display_order }
    if (editing) {
      await supabase.from('forum_categories').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('forum_categories').insert(payload)
    }
    await load()
    setShowForm(false)
    setSaving(false)
  }

  async function deleteCategory(id: string) {
    if (!confirm('Remover esta categoria?')) return
    setDeletingId(id)
    await supabase.from('forum_categories').delete().eq('id', id)
    setCategories((prev) => prev.filter((c) => c.id !== id))
    setDeletingId(null)
  }

  if (loading) return <p className="text-sm text-zinc-500">Carregando...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Categorias do Fórum</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{categories.length} categoria{categories.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="rounded-lg px-4 py-2 text-sm font-medium text-white transition" style={{ backgroundColor: '#0B7A3B' }}>
          + Nova categoria
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-7 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">{editing ? 'Editar categoria' : 'Nova categoria'}</h2>
              <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-zinc-700 text-xl">×</button>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-500">Nome *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} placeholder="Ex: Dúvidas" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-500">Descrição</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={input} placeholder="Breve descrição..." />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-500">Ordem</label>
                <input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} className={input} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={save} disabled={saving || !form.name.trim()} className="flex-1 rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#0B7A3B' }}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={() => setShowForm(false)} className="rounded-lg border border-zinc-200 px-5 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {categories.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">Nenhuma categoria cadastrada.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-white rounded-2xl border border-zinc-200 p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-900">{cat.name}</p>
                {cat.description && <p className="text-xs text-zinc-400 mt-0.5">{cat.description}</p>}
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => openEdit(cat)} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition">Editar</button>
                <button onClick={() => deleteCategory(cat.id)} disabled={deletingId === cat.id} className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-50 transition">Remover</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const input = 'w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 transition'
