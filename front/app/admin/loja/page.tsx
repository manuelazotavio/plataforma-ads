'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'
import { LoadingState } from '@/app/components/LoadingScreen'
import { useImageCropper } from '@/app/components/ImageCropper'

type StoreItem = {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  is_visible: boolean
  display_order: number
  created_at: string
}

const inputCls = 'w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 transition'

export default function AdminLojaPage() {
  const { cropImage, cropperNode } = useImageCropper('1:1')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [items, setItems] = useState<StoreItem[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', description: '', price: '', image_url: '' })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  async function load() {
    const { data } = await supabase
      .from('store_items')
      .select('*')
      .order('display_order')
      .order('created_at')
    setItems((data ?? []) as StoreItem[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function uploadImage(file: File) {
    setUploading(true)
    setError(null)
    const cropped = await cropImage(file, '1:1')
    if (!cropped) { setUploading(false); return }
    const ext = cropped.name.split('.').pop()
    const path = `store/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, cropped, { upsert: true })
    if (upErr) { setError('Erro ao enviar imagem: ' + upErr.message); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    setForm(f => ({ ...f, image_url: publicUrl }))
    setUploading(false)
  }

  async function save() {
    if (!form.name.trim()) { setError('Nome obrigatório'); return }
    const price = parseFloat(form.price.replace(',', '.')) || 0
    setSaving(true); setError(null)

    if (editingId) {
      const { error: e } = await supabase.from('store_items').update({
        name: form.name.trim(),
        description: form.description.trim() || null,
        price,
        image_url: form.image_url || null,
      }).eq('id', editingId)
      if (e) { setError(e.message); setSaving(false); return }
      setEditingId(null)
    } else {
      const { error: e } = await supabase.from('store_items').insert({
        name: form.name.trim(),
        description: form.description.trim() || null,
        price,
        image_url: form.image_url || null,
        display_order: items.length,
      })
      if (e) { setError(e.message); setSaving(false); return }
    }

    setForm({ name: '', description: '', price: '', image_url: '' })
    await load()
    setSaving(false)
  }

  async function toggleVisible(id: string, current: boolean) {
    await supabase.from('store_items').update({ is_visible: !current }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_visible: !current } : i))
  }

  async function deleteItem(id: string) {
    await supabase.from('store_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function startEdit(item: StoreItem) {
    setEditingId(item.id)
    setForm({
      name: item.name,
      description: item.description ?? '',
      price: item.price.toFixed(2),
      image_url: item.image_url ?? '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm({ name: '', description: '', price: '', image_url: '' })
    setError(null)
  }

  if (loading) return <LoadingState message="Carregando loja" />

  return (
    <div className="max-w-4xl mx-auto">
      {cropperNode}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => {
        const f = e.target.files?.[0]
        if (f) void uploadImage(f)
        e.target.value = ''
      }} />

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900">Loja</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Gerencie os produtos disponíveis na loja</p>
      </div>

     
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 mb-8">
        <h2 className="text-base font-semibold text-zinc-900 mb-4">
          {editingId ? 'Editar produto' : 'Novo produto'}
        </h2>

        <div className="flex gap-5">
        
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="relative h-24 w-24 shrink-0 rounded-xl border-2 border-dashed border-zinc-300 overflow-hidden bg-zinc-50 hover:border-zinc-400 transition disabled:opacity-50"
          >
            {form.image_url ? (
              <Image src={form.image_url} alt="" fill className="object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-zinc-400">
                <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <rect x={3} y={3} width={18} height={18} rx={2} />
                  <circle cx={8.5} cy={8.5} r={1.5} />
                  <path d="m21 15-5-5L5 21" />
                </svg>
                <span className="text-[10px] font-medium">{uploading ? 'Enviando...' : 'Foto'}</span>
              </div>
            )}
          </button>

          <div className="flex-1 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Nome *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Nome do produto" />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Preço (R$)</label>
                <input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className={inputCls} placeholder="0,00" inputMode="decimal" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">Descrição (opcional)</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={`${inputCls} resize-none`} rows={2} placeholder="Detalhes do produto..." />
            </div>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex gap-2">
          <button onClick={save} disabled={saving || uploading} className="rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-50 transition" style={{ backgroundColor: '#2F9E41' }}>
            {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Adicionar produto'}
          </button>
          {editingId && (
            <button onClick={cancelEdit} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition">
              Cancelar
            </button>
          )}
        </div>
      </div>

     
      {items.length === 0 ? (
        <p className="text-center text-sm text-zinc-400 py-12">Nenhum produto cadastrado ainda.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map(item => (
            <div key={item.id} className={`flex items-center gap-4 rounded-xl border bg-white p-4 ${item.is_visible ? 'border-zinc-200' : 'border-zinc-100 opacity-60'}`}>
              <div className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden bg-zinc-100">
                {item.image_url
                  ? <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                  : <div className="flex h-full items-center justify-center text-zinc-300 text-xl">?</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-900 truncate">{item.name}</p>
                {item.description && <p className="text-xs text-zinc-400 truncate mt-0.5">{item.description}</p>}
                <p className="text-sm font-bold mt-0.5" style={{ color: '#2F9E41' }}>
                  {item.price === 0 ? 'Grátis' : `R$ ${item.price.toFixed(2).replace('.', ',')}`}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => startEdit(item)} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition">
                  Editar
                </button>
                <button onClick={() => toggleVisible(item.id, item.is_visible)} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition">
                  {item.is_visible ? 'Ocultar' : 'Publicar'}
                </button>
                <button onClick={() => deleteItem(item.id)} className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition">
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
