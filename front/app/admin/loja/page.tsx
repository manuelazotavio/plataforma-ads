'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'
import { LoadingState } from '@/app/components/LoadingScreen'
import { useImageCropper } from '@/app/components/ImageCropper'
import { COURSE_SETTINGS_TABLE } from '@/app/lib/courseSettings'
import UserAvatar from '@/app/components/UserAvatar'

type StoreItem = {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  category: string | null
  type: 'normal' | 'collective'
  min_quantity: number
  sizes: string[]
  pix_key: string | null
  deposit_percent: number
  whatsapp_contact: string | null
  is_visible: boolean
  display_order: number
  created_at: string
}

type StoreSignup = {
  id: string
  user_id: string
  item_id: string
  size: string | null
  status: string
  created_at: string
  users: { id: string; name: string; avatar_url: string | null } | null
}

type OrderItem = { id: string; name: string; price: number; qty: number; category?: string }

type StoreOrder = {
  id: string
  user_id: string | null
  items: OrderItem[]
  total: number
  status: string
  created_at: string
  users: { id: string; name: string; avatar_url: string | null } | null
}

const CATEGORIES = ['Vestuário', 'Papelaria', 'Acessórios', 'Outros']
const SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XGG']
const WHATSAPP_KEY = 'store_whatsapp'

const inputCls = 'w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 transition'

const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Pendente',   color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  confirmed: { label: 'Confirmado', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  delivered: { label: 'Entregue',   color: 'bg-green-50 text-green-700 border-green-200' },
  cancelled: { label: 'Cancelado',  color: 'bg-red-50 text-red-600 border-red-200' },
}

function fmtPrice(price: number) {
  return price === 0 ? 'Grátis' : `R$ ${price.toFixed(2).replace('.', ',')}`
}

export default function AdminLojaPage() {
  const { cropImage, cropperNode } = useImageCropper('1:1')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [tab, setTab] = useState<'produtos' | 'pedidos' | 'inscricoes' | 'config'>('produtos')

  
  const [items, setItems] = useState<StoreItem[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', description: '', price: '', image_url: '', category: '', type: 'normal' as 'normal' | 'collective', min_quantity: '10', sizes: [] as string[], pix_key: '', deposit_percent: '50', whatsapp_contact: '' })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

 
  const [orders, setOrders] = useState<StoreOrder[]>([])
  const [ordersLoaded, setOrdersLoaded] = useState(false)

 
  const [selectedItemId, setSelectedItemId] = useState('')
  const [signups, setSignups] = useState<StoreSignup[]>([])
  const [signupsLoading, setSignupsLoading] = useState(false)
  const [closingBatch, setClosingBatch] = useState(false)

 
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [configSaving, setConfigSaving] = useState(false)
  const [configSaved, setConfigSaved] = useState(false)

  async function loadItems() {
    const { data } = await supabase.from('store_items').select('*').order('display_order').order('created_at')
    setItems((data ?? []) as StoreItem[])
    setLoading(false)
  }

  useEffect(() => { void loadItems() }, [])

  useEffect(() => {
    if (tab === 'pedidos' && !ordersLoaded) void loadOrders()
    if (tab === 'inscricoes' && items.length > 0) {
      const first = items.find(i => i.type === 'collective')
      if (first && !selectedItemId) setSelectedItemId(first.id)
    }
    if (tab === 'config') void loadConfig()
  }, [tab, items])

  useEffect(() => {
    if (selectedItemId) void loadSignups(selectedItemId)
  }, [selectedItemId])

  async function loadOrders() {
    const { data } = await supabase
      .from('store_orders')
      .select('*, users(id, name, avatar_url)')
      .order('created_at', { ascending: false })
    setOrders((data ?? []) as unknown as StoreOrder[])
    setOrdersLoaded(true)
  }

  async function loadSignups(itemId: string) {
    setSignupsLoading(true)
    const { data } = await supabase
      .from('store_signups')
      .select('*, users(id, name, avatar_url)')
      .eq('item_id', itemId)
      .order('created_at', { ascending: false })
    setSignups((data ?? []) as unknown as StoreSignup[])
    setSignupsLoading(false)
  }

  async function loadConfig() {
    const { data } = await supabase.from(COURSE_SETTINGS_TABLE).select('value').eq('key', WHATSAPP_KEY).maybeSingle()
    if (data?.value) setWhatsappNumber(data.value)
  }

  async function saveConfig() {
    setConfigSaving(true)
    await supabase.from(COURSE_SETTINGS_TABLE).upsert({ key: WHATSAPP_KEY, value: whatsappNumber.trim() }, { onConflict: 'key' })
    setConfigSaving(false)
    setConfigSaved(true)
    setTimeout(() => setConfigSaved(false), 2000)
  }

  async function uploadImage(file: File) {
    setUploading(true); setError(null)
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
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price,
      image_url: form.image_url || null,
      category: form.category || null,
      type: form.type,
      min_quantity: parseInt(form.min_quantity) || 10,
      sizes: form.type === 'collective' ? form.sizes : [],
      pix_key: form.type === 'collective' ? (form.pix_key.trim() || null) : null,
      deposit_percent: parseInt(form.deposit_percent) || 50,
      whatsapp_contact: form.type === 'collective' ? (form.whatsapp_contact.trim() || null) : null,
    }
    setSaving(true); setError(null)
    if (editingId) {
      const { error: e } = await supabase.from('store_items').update(payload).eq('id', editingId)
      if (e) { setError(e.message); setSaving(false); return }
      setEditingId(null)
    } else {
      const { error: e } = await supabase.from('store_items').insert({ ...payload, display_order: items.length })
      if (e) { setError(e.message); setSaving(false); return }
    }
    resetForm()
    await loadItems()
    setSaving(false)
  }

  function resetForm() {
    setForm({ name: '', description: '', price: '', image_url: '', category: '', type: 'normal', min_quantity: '10', sizes: [], pix_key: '', deposit_percent: '50', whatsapp_contact: '' })
    setEditingId(null); setError(null)
  }

  function startEdit(item: StoreItem) {
    setEditingId(item.id)
    setForm({
      name: item.name, description: item.description ?? '', price: item.price.toFixed(2),
      image_url: item.image_url ?? '', category: item.category ?? '',
      type: item.type, min_quantity: String(item.min_quantity), sizes: item.sizes ?? [],
      pix_key: item.pix_key ?? '', deposit_percent: String(item.deposit_percent ?? 50), whatsapp_contact: item.whatsapp_contact ?? '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function toggleVisible(id: string, current: boolean) {
    await supabase.from('store_items').update({ is_visible: !current }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_visible: !current } : i))
  }

  async function deleteItem(id: string) {
    await supabase.from('store_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function updateOrderStatus(id: string, status: string) {
    await supabase.from('store_orders').update({ status }).eq('id', id)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
  }

  async function confirmPayment(signupId: string) {
    await supabase.from('store_signups').update({ status: 'active' }).eq('id', signupId)
    setSignups(prev => prev.map(s => s.id === signupId ? { ...s, status: 'active' } : s))
  }

  async function closeBatch() {
    if (!selectedItemId) return
    if (!window.confirm('Fechar este lote? Todos os inscritos serão marcados como confirmados.')) return
    setClosingBatch(true)
    await supabase.from('store_signups').update({ status: 'confirmed' }).eq('item_id', selectedItemId).eq('status', 'active')
    await loadSignups(selectedItemId)
    setClosingBatch(false)
  }

  function toggleSize(size: string) {
    setForm(f => ({
      ...f,
      sizes: f.sizes.includes(size) ? f.sizes.filter(s => s !== size) : [...f.sizes, size],
    }))
  }

  const collectiveItems = items.filter(i => i.type === 'collective')
  const activeSignups = signups.filter(s => s.status === 'active' || s.status === 'awaiting_payment')
  const awaitingPayment = signups.filter(s => s.status === 'awaiting_payment')
  const selectedItem = items.find(i => i.id === selectedItemId)

  if (loading) return <LoadingState message="Carregando loja" />

  const TABS = [
    { id: 'produtos', label: 'Produtos' },
    { id: 'pedidos', label: 'Pedidos WhatsApp' },
    { id: 'inscricoes', label: 'Inscrições' },
    { id: 'config', label: 'Configurações' },
  ] as const

  return (
    <div className="max-w-5xl mx-auto">
      {cropperNode}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => {
        const f = e.target.files?.[0]; if (f) void uploadImage(f); e.target.value = ''
      }} />

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Loja</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Gerencie produtos, pedidos e inscrições</p>
      </div>

      
      <div className="flex gap-1 border-b border-zinc-200 mb-8">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${tab === t.id ? 'border-[#2F9E41] text-[#2F9E41]' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      
      {tab === 'produtos' && (
        <div>
          
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 mb-8">
            <h2 className="text-base font-semibold text-zinc-900 mb-4">{editingId ? 'Editar produto' : 'Novo produto'}</h2>

            <div className="flex gap-5">
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="relative h-24 w-24 shrink-0 rounded-xl border-2 border-dashed border-zinc-300 overflow-hidden bg-zinc-50 hover:border-zinc-400 transition disabled:opacity-50">
                {form.image_url
                  ? <Image src={form.image_url} alt="" fill className="object-cover" />
                  : <div className="flex h-full flex-col items-center justify-center gap-1 text-zinc-400">
                      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                        <rect x={3} y={3} width={18} height={18} rx={2} /><circle cx={8.5} cy={8.5} r={1.5} /><path d="m21 15-5-5L5 21" />
                      </svg>
                      <span className="text-[10px] font-medium">{uploading ? 'Enviando...' : 'Foto'}</span>
                    </div>
                }
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
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-zinc-500 mb-1 block">Categoria</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>
                      <option value="">Sem categoria</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-500 mb-1 block">Tipo de pedido</label>
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as 'normal' | 'collective' }))} className={inputCls}>
                      <option value="normal">Normal (WhatsApp)</option>
                      <option value="collective">Compra coletiva</option>
                    </select>
                  </div>
                </div>

                {form.type === 'collective' && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col gap-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-medium text-amber-700 mb-1 block">Mínimo de inscrições</label>
                        <input value={form.min_quantity} onChange={e => setForm(f => ({ ...f, min_quantity: e.target.value }))} className={inputCls} type="number" min={1} placeholder="10" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-amber-700 mb-1 block">% do sinal (entrada)</label>
                        <input value={form.deposit_percent} onChange={e => setForm(f => ({ ...f, deposit_percent: e.target.value }))} className={inputCls} type="number" min={1} max={100} placeholder="50" />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-medium text-amber-700 mb-1 block">Chave PIX</label>
                        <input value={form.pix_key} onChange={e => setForm(f => ({ ...f, pix_key: e.target.value }))} className={inputCls} placeholder="email, CPF ou telefone" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-amber-700 mb-1 block">WhatsApp para comprovante</label>
                        <input value={form.whatsapp_contact} onChange={e => setForm(f => ({ ...f, whatsapp_contact: e.target.value }))} className={inputCls} placeholder="5511999999999" inputMode="numeric" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-amber-700 mb-2 block">Tamanhos disponíveis</label>
                      <div className="flex flex-wrap gap-2">
                        {SIZES.map(size => (
                          <button key={size} type="button" onClick={() => toggleSize(size)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${form.sizes.includes(size) ? 'border-amber-400 bg-amber-100 text-amber-700' : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300'}`}>
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

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
                <button onClick={resetForm} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition">Cancelar</button>
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
                      : <div className="flex h-full items-center justify-center text-zinc-300 text-xl">?</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-zinc-900 truncate">{item.name}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${item.type === 'collective' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-zinc-50 text-zinc-500 border-zinc-200'}`}>
                        {item.type === 'collective' ? 'Compra coletiva' : 'Normal'}
                      </span>
                      {item.category && <span className="shrink-0 rounded-full border border-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">{item.category}</span>}
                    </div>
                    {item.description && <p className="text-xs text-zinc-400 truncate mt-0.5">{item.description}</p>}
                    <p className="text-sm font-bold mt-0.5" style={{ color: '#2F9E41' }}>{fmtPrice(item.price)}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => startEdit(item)} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition">Editar</button>
                    <button onClick={() => toggleVisible(item.id, item.is_visible)} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition">
                      {item.is_visible ? 'Ocultar' : 'Publicar'}
                    </button>
                    <button onClick={() => deleteItem(item.id)} className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition">Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

     
      {tab === 'pedidos' && (
        <div>
          {!ordersLoaded ? (
            <p className="text-sm text-zinc-400 text-center py-12">Carregando...</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-12">Nenhum pedido registrado ainda.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {orders.map(order => {
                const user = order.users as unknown as { id: string; name: string; avatar_url: string | null } | null
                const st = ORDER_STATUS[order.status] ?? ORDER_STATUS.pending
                return (
                  <div key={order.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar src={user?.avatar_url} name={user?.name ?? '?'} className="h-8 w-8 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">{user?.name ?? 'Usuário removido'}</p>
                          <p className="text-xs text-zinc-400">{new Date(order.created_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${st.color}`}>{st.label}</span>
                        <select
                          value={order.status}
                          onChange={e => updateOrderStatus(order.id, e.target.value)}
                          className="rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-600 outline-none"
                        >
                          {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 mb-2">
                      {(order.items as OrderItem[]).map((it, i) => (
                        <p key={i} className="text-xs text-zinc-600">• {it.qty}x {it.name} — {fmtPrice(it.price)}</p>
                      ))}
                    </div>
                    <p className="text-sm font-bold" style={{ color: '#2F9E41' }}>Total: {fmtPrice(order.total)}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

    
      {tab === 'inscricoes' && (
        <div>
          {collectiveItems.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-12">Nenhum produto de compra coletiva cadastrado.</p>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <select
                  value={selectedItemId}
                  onChange={e => setSelectedItemId(e.target.value)}
                  className={`${inputCls} max-w-xs`}
                >
                  {collectiveItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                {selectedItem && (
                  <span className="text-sm text-zinc-500">
                    Meta: <strong className="text-zinc-900">{selectedItem.min_quantity}</strong> — Inscritos: <strong style={{ color: activeSignups.length >= selectedItem.min_quantity ? '#2F9E41' : '#f59e0b' }}>{activeSignups.length}</strong>
                    {awaitingPayment.length > 0 && <span className="ml-2 text-amber-600">({awaitingPayment.length} aguardando PIX)</span>}
                  </span>
                )}
                <button
                  onClick={closeBatch}
                  disabled={closingBatch || activeSignups.length === 0}
                  className="ml-auto rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 transition"
                  style={{ backgroundColor: '#2F9E41' }}
                >
                  {closingBatch ? 'Fechando...' : 'Fechar lote'}
                </button>
              </div>

              {signupsLoading ? (
                <p className="text-sm text-zinc-400 text-center py-8">Carregando...</p>
              ) : signups.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-12">Nenhuma inscrição ainda.</p>
              ) : (
                <div className="rounded-xl border border-zinc-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50 border-b border-zinc-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Aluno</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Tamanho</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Data</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Status</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {signups.map(s => {
                        const u = s.users as unknown as { id: string; name: string; avatar_url: string | null } | null
                        return (
                          <tr key={s.id} className={s.status === 'cancelled' ? 'opacity-40' : ''}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <UserAvatar src={u?.avatar_url} name={u?.name ?? '?'} className="h-7 w-7 shrink-0" />
                                <span className="font-medium text-zinc-900">{u?.name ?? '—'}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-zinc-700 font-semibold">{s.size ?? '—'}</td>
                            <td className="px-4 py-3 text-zinc-400 text-xs">{new Date(s.created_at).toLocaleDateString('pt-BR')}</td>
                            <td className="px-4 py-3">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                                s.status === 'awaiting_payment' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                s.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                                s.status === 'confirmed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                'bg-zinc-50 text-zinc-400 border-zinc-200'
                              }`}>
                                {s.status === 'awaiting_payment' ? 'Aguardando PIX' : s.status === 'active' ? 'Inscrito' : s.status === 'confirmed' ? 'Confirmado' : 'Cancelado'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {s.status === 'awaiting_payment' && (
                                <button onClick={() => confirmPayment(s.id)}
                                  className="rounded-lg border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-100 transition">
                                  Confirmar PIX
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      
      {tab === 'config' && (
        <div className="max-w-md">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="text-base font-semibold text-zinc-900 mb-1">WhatsApp do vendedor</h2>
            <p className="text-xs text-zinc-400 mb-4">Número que receberá os pedidos. Inclua DDI e DDD (ex: 5511999999999).</p>
            <div className="flex gap-2">
              <input
                value={whatsappNumber}
                onChange={e => setWhatsappNumber(e.target.value)}
                className={`${inputCls} flex-1`}
                placeholder="5511999999999"
                inputMode="numeric"
              />
              <button onClick={saveConfig} disabled={configSaving} className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 transition" style={{ backgroundColor: '#2F9E41' }}>
                {configSaved ? 'Salvo!' : configSaving ? '...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
