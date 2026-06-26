'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'
import { LoadingState } from '@/app/components/LoadingScreen'
import { useImageCropper } from '@/app/components/ImageCropper'
import UserAvatar from '@/app/components/UserAvatar'
import Select from '@/app/components/Select'



type CollectiveField = {
  key: string
  label: string
  type: 'boolean' | 'select'
  options?: string[]
}

type SellerProfile = {
  user_id: string
  whatsapp: string | null
  pix_key: string | null
  deposit_percent: number
  users: { id: string; name: string; avatar_url: string | null } | null
}

type StoreItem = {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  images: string[] | null
  category: string | null
  type: 'normal' | 'collective'
  min_quantity: number
  sizes: string[]
  collective_deadline: string | null
  collective_fields: CollectiveField[] | null
  collective_info: string | null
  seller_id: string | null
  is_visible: boolean
  display_order: number
  created_at: string
  seller: {
    id: string
    name: string
    avatar_url: string | null
    store_seller_profiles: { whatsapp: string | null; pix_key: string | null; deposit_percent: number }[]
  } | null
}

type StoreSignup = {
  id: string
  user_id: string
  item_id: string
  size: string | null
  status: string
  details: Record<string, unknown> | null
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

const inputCls = 'w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 transition dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'

const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Pendente',   color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  confirmed: { label: 'Confirmado', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  delivered: { label: 'Entregue',   color: 'bg-green-50 text-green-700 border-green-200' },
  cancelled: { label: 'Cancelado',  color: 'bg-red-50 text-red-600 border-red-200' },
}
const CATEGORY_OPTIONS = CATEGORIES.map(c => ({ value: c, label: c }))
const TYPE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'collective', label: 'Compra coletiva' },
]
const ORDER_STATUS_OPTIONS = Object.entries(ORDER_STATUS).map(([value, status]) => ({ value, label: status.label }))

function fmtPrice(price: number) {
  return price === 0 ? 'Grátis' : `R$ ${price.toFixed(2).replace('.', ',')}`
}

function signupDetailsLabel(details: Record<string, unknown> | null) {
  if (!details) return ''
  const labels = [
    details.helanca === true ? 'Helanca' : details.helanca === false ? 'Moletom' : null,
    details.zipper === true ? 'com ziper' : details.zipper === false ? 'fechado' : null,
    details.pocket === true ? 'com bolso' : details.pocket === false ? 'sem bolso' : null,
    details.hood === true ? 'com gorro' : details.hood === false ? 'sem gorro' : null,
    typeof details.price === 'number' ? fmtPrice(details.price) : null,
  ].filter(Boolean)
  return labels.join(' · ')
}

function slugifyFileName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'inscricoes'
}



export default function AdminLojaPage() {
  const { cropImage, cropperNode } = useImageCropper('1:1')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [tab, setTab] = useState<'produtos' | 'pedidos' | 'inscricoes' | 'responsaveis'>('produtos')


  const [items, setItems] = useState<StoreItem[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    name: '', description: '', price: '', image_url: '', images: [] as string[], category: '',
    type: 'normal' as 'normal' | 'collective', min_quantity: '10',
    sizes: [] as string[], collective_deadline: '',
    collective_fields: [] as CollectiveField[], collective_info: '',
    seller_id: '', is_visible: true,
  })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [productModalOpen, setProductModalOpen] = useState(false)

 
  const [orders, setOrders] = useState<StoreOrder[]>([])
  const [ordersLoaded, setOrdersLoaded] = useState(false)


  const [selectedItemId, setSelectedItemId] = useState('')
  const [signups, setSignups] = useState<StoreSignup[]>([])
  const [signupsLoading, setSignupsLoading] = useState(false)
  const [signupsError, setSignupsError] = useState<string | null>(null)
  const [closingBatch, setClosingBatch] = useState(false)
  const [exportingSignups, setExportingSignups] = useState(false)

 
  const [sellers, setSellers] = useState<SellerProfile[]>([])
  const [allUsers, setAllUsers] = useState<{ id: string; name: string; avatar_url: string | null }[]>([])
  const [sellerForm, setSellerForm] = useState({ userId: '', whatsapp: '', pix_key: '', deposit_percent: '50' })
  const [sellerEditId, setSellerEditId] = useState<string | null>(null)
  const [sellerSaving, setSellerSaving] = useState(false)
  const [sellerError, setSellerError] = useState<string | null>(null)
  const [userSearch, setUserSearch] = useState('')
  const [sellersLoaded, setSellersLoaded] = useState(false)


  async function loadItems() {
    const { data } = await supabase
      .from('store_items')
      .select('*, seller:users!seller_id(id, name, avatar_url, store_seller_profiles(whatsapp, pix_key, deposit_percent))')
      .order('display_order').order('created_at')
    setItems((data ?? []) as unknown as StoreItem[])
    setLoading(false)
  }

  async function loadSellers() {
    const { data } = await supabase
      .from('store_seller_profiles')
      .select('*, users(id, name, avatar_url)')
      .order('created_at')
    setSellers((data ?? []) as unknown as SellerProfile[])
    setSellersLoaded(true)
  }

  async function loadAllUsers() {
    const { data } = await supabase.from('users').select('id, name, avatar_url').order('name')
    setAllUsers((data ?? []) as { id: string; name: string; avatar_url: string | null }[])
  }

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
    setSignupsError(null)
    const { data, error } = await supabase
      .from('store_signups')
      .select('id, user_id, item_id, size, status, details, created_at')
      .eq('item_id', itemId)
      .order('created_at', { ascending: false })
    if (error) {
      setSignups([])
      setSignupsError(error.message)
      setSignupsLoading(false)
      return
    }

    const rows = (data ?? []) as Omit<StoreSignup, 'users'>[]
    const userIds = [...new Set(rows.map(s => s.user_id).filter(Boolean))]
    const { data: usersData } = userIds.length > 0
      ? await supabase.from('users').select('id, name, avatar_url').in('id', userIds)
      : { data: [] as { id: string; name: string; avatar_url: string | null }[] }
    const usersById = new Map((usersData ?? []).map(u => [u.id, u]))

    setSignups(rows.map(s => ({
      ...s,
      users: usersById.get(s.user_id) ?? null,
    })))
    setSignupsLoading(false)
  }

  useEffect(() => {
    void Promise.all([loadItems(), loadSellers(), loadAllUsers()])
  }, [])

  useEffect(() => {
    if (tab === 'pedidos' && !ordersLoaded) void loadOrders()
    if (tab === 'inscricoes' && items.length > 0) {
      const first = items.find(i => i.type === 'collective')
      if (first && !selectedItemId) setSelectedItemId(first.id)
    }
  }, [tab, items, ordersLoaded, selectedItemId]) 

  useEffect(() => {
    if (selectedItemId) void loadSignups(selectedItemId)
  }, [selectedItemId])

  

  async function uploadImage(file: File) {
    setUploading(true); setError(null)
    const cropped = await cropImage(file, '1:1')
    if (!cropped) { setUploading(false); return }
    const ext = cropped.name.split('.').pop()
    const path = `store/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, cropped, { upsert: true })
    if (upErr) { setError('Erro ao enviar imagem: ' + upErr.message); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    setForm(f => ({ ...f, images: [...f.images, publicUrl] }))
    setUploading(false)
  }

  function removeImage(index: number) {
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== index) }))
  }

  async function save() {
    if (!form.name.trim()) { setError('Nome obrigatório'); return }
    const price = parseFloat(form.price.replace(',', '.')) || 0
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price,
      image_url: form.images[0] ?? null,
      images: form.images.length > 0 ? form.images : null,
      category: form.category || null,
      type: form.type,
      min_quantity: parseInt(form.min_quantity) || 10,
      sizes: form.type === 'collective' ? form.sizes : [],
      collective_deadline: form.type === 'collective' && form.collective_deadline ? form.collective_deadline : null,
      collective_fields: form.type === 'collective' && form.collective_fields.length > 0
        ? form.collective_fields.map(f => ({ ...f, key: f.key || genFieldKey(f.label) }))
        : null,
      collective_info: form.type === 'collective' && form.collective_info.trim() ? form.collective_info.trim() : null,
      seller_id: form.seller_id || null,
      is_visible: form.is_visible,
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
    setForm({ name: '', description: '', price: '', image_url: '', images: [], category: '', type: 'normal', min_quantity: '10', sizes: [], collective_deadline: '', collective_fields: [], collective_info: '', seller_id: '', is_visible: true })
    setEditingId(null); setError(null)
    setProductModalOpen(false)
  }

  function openNewProductModal() {
    setForm({ name: '', description: '', price: '', image_url: '', images: [], category: '', type: 'normal', min_quantity: '10', sizes: [], collective_deadline: '', collective_fields: [], collective_info: '', seller_id: '', is_visible: true })
    setEditingId(null)
    setError(null)
    setProductModalOpen(true)
  }

  function startEdit(item: StoreItem) {
    setEditingId(item.id)
    const images = item.images?.length ? item.images : (item.image_url ? [item.image_url] : [])
    setForm({
      name: item.name, description: item.description ?? '', price: item.price.toFixed(2),
      image_url: item.image_url ?? '', images, category: item.category ?? '',
      type: item.type, min_quantity: String(item.min_quantity), sizes: item.sizes ?? [],
      collective_deadline: item.collective_deadline ?? '',
      collective_fields: item.collective_fields ?? [],
      collective_info: item.collective_info ?? '',
      seller_id: item.seller_id ?? '', is_visible: item.is_visible,
    })
    setError(null)
    setProductModalOpen(true)
  }

  function toggleSize(size: string) {
    setForm(f => ({ ...f, sizes: f.sizes.includes(size) ? f.sizes.filter(s => s !== size) : [...f.sizes, size] }))
  }

  function genFieldKey(label: string) {
    return label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `campo_${Date.now()}`
  }
  function addField() {
    setForm(f => ({ ...f, collective_fields: [...f.collective_fields, { key: '', label: '', type: 'boolean' as const }] }))
  }
  function updateField(i: number, patch: Partial<CollectiveField>) {
    setForm(f => ({ ...f, collective_fields: f.collective_fields.map((fd, idx) => idx === i ? { ...fd, ...patch } : fd) }))
  }
  function removeField(i: number) {
    setForm(f => ({ ...f, collective_fields: f.collective_fields.filter((_, idx) => idx !== i) }))
  }

  async function toggleVisible(id: string, current: boolean) {
    await supabase.from('store_items').update({ is_visible: !current }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_visible: !current } : i))
  }

  async function deleteItem(id: string) {
    if (!window.confirm('Excluir este produto?')) return
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

  async function exportSignupsXlsx() {
    if (!selectedItem || signups.length === 0) return
    setExportingSignups(true)
    try {
      const ExcelJSModule = await import('exceljs')
      const ExcelJS = ExcelJSModule.default ?? ExcelJSModule
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'Plataforma ADS'
      workbook.created = new Date()

      const ws = workbook.addWorksheet('Inscrições')
      ws.columns = [
        { header: 'Produto', key: 'produto', width: 32 },
        { header: 'Aluno', key: 'aluno', width: 28 },
        { header: 'Usuário ID', key: 'usuarioId', width: 38 },
        { header: 'Tamanho', key: 'tamanho', width: 12 },
        { header: 'Tecido', key: 'tecido', width: 14 },
        { header: 'Zíper', key: 'ziper', width: 10 },
        { header: 'Bolso', key: 'bolso', width: 10 },
        { header: 'Gorro', key: 'gorro', width: 10 },
        { header: 'Preço', key: 'preco', width: 12 },
        { header: 'Status', key: 'status', width: 18 },
        { header: 'Data', key: 'data', width: 20 },
      ]

      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F9E41' } }
      ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }

      signups.forEach(s => {
        const details = s.details ?? {}
        ws.addRow({
          produto: selectedItem.name,
          aluno: s.users?.name ?? '',
          usuarioId: s.user_id,
          tamanho: s.size ?? '',
          tecido: details.helanca === true ? 'Helanca' : details.helanca === false ? 'Moletom' : '',
          ziper: details.zipper === true ? 'Sim' : details.zipper === false ? 'Não' : '',
          bolso: details.pocket === true ? 'Sim' : details.pocket === false ? 'Não' : '',
          gorro: details.hood === true ? 'Sim' : details.hood === false ? 'Não' : '',
          preco: typeof details.price === 'number' ? details.price : null,
          status: s.status,
          data: new Date(s.created_at),
        })
      })

      ws.getColumn('preco').numFmt = '"R$" #,##0.00'
      ws.getColumn('data').numFmt = 'dd/mm/yyyy hh:mm'
      ws.eachRow(row => {
        row.eachCell(cell => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE4E4E7' } },
            left: { style: 'thin', color: { argb: 'FFE4E4E7' } },
            bottom: { style: 'thin', color: { argb: 'FFE4E4E7' } },
            right: { style: 'thin', color: { argb: 'FFE4E4E7' } },
          }
          cell.alignment = { vertical: 'middle', wrapText: true }
        })
      })

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer as ArrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${slugifyFileName(selectedItem.name)}-inscricoes.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } finally {
      setExportingSignups(false)
    }
  }

  
  function startEditSeller(s: SellerProfile) {
    setSellerEditId(s.user_id)
    setSellerForm({ userId: s.user_id, whatsapp: s.whatsapp ?? '', pix_key: s.pix_key ?? '', deposit_percent: String(s.deposit_percent) })
    setSellerError(null)
  }

  function resetSellerForm() {
    setSellerForm({ userId: '', whatsapp: '', pix_key: '', deposit_percent: '50' })
    setSellerEditId(null); setSellerError(null); setUserSearch('')
  }

  async function saveSeller() {
    if (!sellerForm.userId) { setSellerError('Selecione um usuário'); return }
    if (!sellerForm.whatsapp.trim()) { setSellerError('WhatsApp obrigatório'); return }
    setSellerSaving(true); setSellerError(null)
    const { error: e } = await supabase.from('store_seller_profiles').upsert({
      user_id: sellerForm.userId,
      whatsapp: sellerForm.whatsapp.trim(),
      pix_key: sellerForm.pix_key.trim() || null,
      deposit_percent: parseInt(sellerForm.deposit_percent) || 50,
    }, { onConflict: 'user_id' })
    if (e) { setSellerError(e.message); setSellerSaving(false); return }
    await loadSellers()
    resetSellerForm()
    setSellerSaving(false)
  }

  async function deleteSeller(userId: string) {
    if (!window.confirm('Remover este responsável? Os produtos vinculados perderão o responsável.')) return
    await supabase.from('store_seller_profiles').delete().eq('user_id', userId)
    setSellers(prev => prev.filter(s => s.user_id !== userId))
  }

 

  const collectiveItems = items.filter(i => i.type === 'collective')
  const activeSignups = signups.filter(s => s.status === 'active' || s.status === 'awaiting_payment')
  const awaitingPayment = signups.filter(s => s.status === 'awaiting_payment')
  const selectedItem = items.find(i => i.id === selectedItemId)

  const existingSellerIds = new Set(sellers.map(s => s.user_id))
  const availableUsers = allUsers.filter(u =>
    !existingSellerIds.has(u.id) || u.id === sellerEditId
  ).filter(u => userSearch.trim() === '' || u.name.toLowerCase().includes(userSearch.toLowerCase()))

  const TABS = [
    { id: 'produtos',    label: 'Produtos' },
    { id: 'pedidos',     label: 'Pedidos' },
    { id: 'inscricoes',  label: 'Inscrições' },
    { id: 'responsaveis',  label: 'Responsáveis' },
  ] as const

  if (loading) return <LoadingState message="Carregando loja" />

  

  return (
    <div className="max-w-5xl mx-auto">
      {cropperNode}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => {
        const f = e.target.files?.[0]; if (f) void uploadImage(f); e.target.value = ''
      }} />

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Loja</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Gerencie produtos, pedidos e responsáveis</p>
      </div>

      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800 mb-8">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${tab === t.id ? 'border-[#2F9E41] text-[#2F9E41]' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

    
      {tab === 'produtos' && (
        <div>
          <div className="mb-6 flex justify-end">
            <button onClick={openNewProductModal} className="rounded-lg px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90" style={{ backgroundColor: '#2F9E41' }}>
              Adicionar produto
            </button>
          </div>

          {productModalOpen && (
            <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
              <button type="button" aria-label="Fechar modal" onClick={resetForm} className="absolute inset-0 bg-black/40" />
              <div className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    {editingId ? 'Editar produto' : 'Novo produto'}
                  </h2>
                  <button onClick={resetForm} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition" aria-label="Fechar">
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><line x1={18} y1={6} x2={6} y2={18}/><line x1={6} y1={6} x2={18} y2={18}/></svg>
                  </button>
                </div>

            <div className="flex flex-col gap-3">
              <label className="text-xs font-medium text-zinc-500">Fotos</label>
              <div className="flex flex-wrap gap-2">
                {form.images.map((url, i) => (
                  <div key={i} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <Image src={url} alt="" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition"
                      aria-label="Remover foto"
                    >
                      <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><line x1={18} y1={6} x2={6} y2={18}/><line x1={6} y1={6} x2={18} y2={18}/></svg>
                    </button>
                  </div>
                ))}
                {form.images.length < 6 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 text-zinc-400 transition hover:border-zinc-400 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x={3} y={3} width={18} height={18} rx={2} /><circle cx={8.5} cy={8.5} r={1.5} /><path d="m21 15-5-5L5 21" /></svg>
                    <span className="text-[10px] font-medium">{uploading ? 'Enviando…' : 'Adicionar'}</span>
                  </button>
                )}
              </div>
            </div>

              <div className="grid gap-3">
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

              
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-500 mb-1 block">Categoria</label>
                    <Select
                      value={form.category}
                      onChange={value => setForm(f => ({ ...f, category: value }))}
                      options={CATEGORY_OPTIONS}
                      placeholder="Sem categoria"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-500 mb-1 block">Tipo</label>
                    <Select
                      value={form.type}
                      onChange={value => setForm(f => ({ ...f, type: value as 'normal' | 'collective' }))}
                      options={TYPE_OPTIONS}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-500 mb-1 block">Responsável</label>
                    <Select
                      value={form.seller_id}
                      onChange={value => setForm(f => ({ ...f, seller_id: value }))}
                      options={sellers.map(s => ({ value: s.user_id, label: s.users?.name ?? s.user_id }))}
                      placeholder="Sem responsável"
                    />
                    {sellers.length === 0 && (
                      <p className="text-[10px] text-zinc-400 mt-1">
                        Cadastre responsáveis na aba <button type="button" onClick={() => setTab('responsaveis')} className="underline">Responsáveis</button>
                      </p>
                    )}
                  </div>
                </div>

                {form.type === 'collective' && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/40 p-4 flex flex-col gap-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-medium text-amber-700 mb-1 block">Mínimo de inscrições</label>
                        <input value={form.min_quantity} onChange={e => setForm(f => ({ ...f, min_quantity: e.target.value }))} className={inputCls} type="number" min={1} placeholder="10" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-amber-700 mb-1 block">Prazo para entrada</label>
                        <input value={form.collective_deadline} onChange={e => setForm(f => ({ ...f, collective_deadline: e.target.value }))} className={inputCls} type="date" />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-amber-700 mb-2 block">Tamanhos disponíveis</label>
                      <div className="flex flex-wrap gap-2">
                        {SIZES.map(size => (
                          <button key={size} type="button" onClick={() => toggleSize(size)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${form.sizes.includes(size) ? 'border-amber-400 bg-amber-100 text-amber-700' : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800'}`}>
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-amber-700">Perguntas personalizadas</label>
                        <button type="button" onClick={addField} className="text-xs font-semibold text-amber-700 hover:text-amber-900 transition">+ Pergunta</button>
                      </div>
                      {form.collective_fields.length === 0 && (
                        <p className="text-[11px] text-amber-600 italic">Nenhuma pergunta. Clique em &quot;+ Pergunta&quot; para adicionar (ex: tamanho de manga, cor, tipo de tecido…).</p>
                      )}
                      {form.collective_fields.map((field, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-white dark:bg-zinc-900 p-2.5">
                          <div className="flex flex-1 flex-col gap-1.5">
                            <input
                              value={field.label}
                              onChange={e => updateField(i, { label: e.target.value, key: genFieldKey(e.target.value) })}
                              className={inputCls}
                              placeholder="Pergunta (ex: Com zíper?)"
                            />
                            <div className="flex flex-wrap gap-1.5">
                              <select
                                value={field.type}
                                onChange={e => updateField(i, { type: e.target.value as 'boolean' | 'select', options: e.target.value === 'select' ? ['Opção 1', 'Opção 2'] : undefined })}
                                className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                              >
                                <option value="boolean">Sim / Não</option>
                                <option value="select">Múltiplas opções</option>
                              </select>
                              {field.type === 'select' && (
                                <input
                                  value={field.options?.join(', ') ?? ''}
                                  onChange={e => updateField(i, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                  className={`${inputCls} flex-1 min-w-0`}
                                  placeholder="Opções separadas por vírgula"
                                />
                              )}
                            </div>
                          </div>
                          <button type="button" onClick={() => removeField(i)} className="mt-0.5 shrink-0 text-zinc-400 hover:text-red-500 transition" aria-label="Remover">
                            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><line x1={18} y1={6} x2={6} y2={18}/><line x1={6} y1={6} x2={18} y2={18}/></svg>
                          </button>
                        </div>
                      ))}
                    </div>

                    <div>
                      <label className="text-xs font-medium text-amber-700 mb-1 block">Texto informativo (opcional)</label>
                      <textarea
                        value={form.collective_info}
                        onChange={e => setForm(f => ({ ...f, collective_info: e.target.value }))}
                        className={`${inputCls} resize-none`}
                        rows={3}
                        placeholder="Informações importantes para o comprador (prazos, políticas, detalhes do material…)"
                      />
                    </div>

                    {form.seller_id && (() => {
                      const sp = sellers.find(s => s.user_id === form.seller_id)
                      if (!sp) return null
                      return (
                        <p className="text-xs text-amber-700 bg-amber-100 rounded-lg px-3 py-2">
                          PIX e WhatsApp virão do responsável <strong>{sp.users?.name}</strong>.
                          {!sp.pix_key && ' ⚠️ Responsável sem chave PIX cadastrada.'}
                          {!sp.whatsapp && ' ⚠️ Responsável sem WhatsApp cadastrado.'}
                        </p>
                      )
                    })()}
                  </div>
                )}

                
                <div>
                  <label className="text-xs font-medium text-zinc-500 mb-1 block">Descrição</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={`${inputCls} resize-none`} rows={2} placeholder="Detalhes do produto..." />
                </div>
              </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-4 flex gap-2">
              <button onClick={save} disabled={saving || uploading}
                className="rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-50 transition hover:opacity-90" style={{ backgroundColor: '#2F9E41' }}>
                {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Adicionar produto'}
              </button>
              <button onClick={resetForm} className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition">Cancelar</button>
                </div>
              </div>
            </div>
          )}

         
          {items.length === 0 ? (
            <p className="text-center text-sm text-zinc-400 py-12">Nenhum produto cadastrado ainda.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map(item => {
                const sp = item.seller?.store_seller_profiles?.[0]
                return (
                  <div key={item.id} className={`flex items-center gap-4 rounded-xl border bg-white dark:bg-zinc-900 p-4 ${item.is_visible ? 'border-zinc-200 dark:border-zinc-800' : 'border-zinc-100 dark:border-zinc-800/50 opacity-60'}`}>
                    <div className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                      {item.image_url ? <Image src={item.image_url} alt={item.name} fill className="object-cover" /> : <div className="flex h-full items-center justify-center text-zinc-300 text-xl">?</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{item.name}</p>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${item.type === 'collective' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-zinc-50 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700'}`}>
                          {item.type === 'collective' ? 'Coletivo' : 'Normal'}
                        </span>
                        {item.category && <span className="shrink-0 rounded-full border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">{item.category}</span>}
                        {item.seller && (
                          <span className="shrink-0 flex items-center gap-1 text-[10px] text-zinc-400">
                            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx={12} cy={7} r={4}/></svg>
                            {item.seller.name}
                            {sp && !sp.whatsapp && <span className="text-amber-500" title="Sem WhatsApp">⚠</span>}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold mt-0.5" style={{ color: '#2F9E41' }}>{fmtPrice(item.price)}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => startEdit(item)} className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition">Editar</button>
                      <button onClick={() => toggleVisible(item.id, item.is_visible)} className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition">
                        {item.is_visible ? 'Ocultar' : 'Publicar'}
                      </button>
                      <button onClick={() => deleteItem(item.id)} className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition">Excluir</button>
                    </div>
                  </div>
                )
              })}
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
                const u = order.users as unknown as { name: string; avatar_url: string | null } | null
                const st = ORDER_STATUS[order.status] ?? ORDER_STATUS.pending
                return (
                  <div key={order.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar src={u?.avatar_url} name={u?.name ?? '?'} className="h-8 w-8 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{u?.name ?? 'Usuário removido'}</p>
                          <p className="text-xs text-zinc-400">{new Date(order.created_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${st.color}`}>{st.label}</span>
                        <Select
                          value={order.status}
                          onChange={value => { void updateOrderStatus(order.id, value) }}
                          options={ORDER_STATUS_OPTIONS}
                          className="w-36"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 mb-2">
                      {(order.items as OrderItem[]).map((it, i) => (
                        <p key={i} className="text-xs text-zinc-600 dark:text-zinc-400">• {it.qty}x {it.name} — {fmtPrice(it.price)}</p>
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
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <Select
                  value={selectedItemId}
                  onChange={setSelectedItemId}
                  options={collectiveItems.map(i => ({ value: i.id, label: i.name }))}
                  className="w-full max-w-xs"
                />
                {selectedItem && (
                  <span className="text-sm text-zinc-500">
                    Meta: <strong className="text-zinc-900 dark:text-zinc-100">{selectedItem.min_quantity}</strong>
                    {' '}— Inscritos: <strong style={{ color: activeSignups.length >= selectedItem.min_quantity ? '#2F9E41' : '#f59e0b' }}>{activeSignups.length}</strong>
                    {awaitingPayment.length > 0 && <span className="ml-2 text-amber-600">({awaitingPayment.length} aguardando PIX)</span>}
                  </span>
                )}
                <div className="ml-auto flex gap-2">
                  <button onClick={() => { void exportSignupsXlsx() }} disabled={signups.length === 0 || exportingSignups}
                    className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-600 dark:text-zinc-300 disabled:opacity-40 transition hover:bg-zinc-50 dark:hover:bg-zinc-800">
                    {exportingSignups ? 'Exportando...' : 'Exportar XLSX'}
                  </button>
                  <button onClick={closeBatch} disabled={closingBatch || activeSignups.length === 0}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 transition hover:opacity-90" style={{ backgroundColor: '#2F9E41' }}>
                    {closingBatch ? 'Fechando...' : 'Fechar lote'}
                  </button>
                </div>
              </div>

              {signupsLoading ? (
                <p className="text-sm text-zinc-400 text-center py-8">Carregando...</p>
              ) : signupsError ? (
                <p className="text-sm text-red-500 text-center py-12">Erro ao carregar inscricoes: {signupsError}</p>
              ) : signups.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-12">Nenhuma inscrição ainda.</p>
              ) : (
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Aluno</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Tamanho</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Data</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Status</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {signups.map(s => {
                        const u = s.users as unknown as { name: string; avatar_url: string | null } | null
                        return (
                          <tr key={s.id} className={s.status === 'cancelled' ? 'opacity-40' : ''}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <UserAvatar src={u?.avatar_url} name={u?.name ?? '?'} className="h-7 w-7 shrink-0" />
                                <span className="font-medium text-zinc-900 dark:text-zinc-100">{u?.name ?? '—'}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-zinc-700 dark:text-zinc-300">{s.size ?? '—'}</p>
                              {signupDetailsLabel(s.details) && (
                                <p className="mt-0.5 max-w-xs text-xs text-zinc-400">{signupDetailsLabel(s.details)}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-zinc-400 text-xs">{new Date(s.created_at).toLocaleDateString('pt-BR')}</td>
                            <td className="px-4 py-3">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                                s.status === 'awaiting_payment' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                s.status === 'active'           ? 'bg-green-50 text-green-700 border-green-200' :
                                s.status === 'confirmed'        ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                'bg-zinc-50 text-zinc-400 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700'
                              }`}>
                                {s.status === 'awaiting_payment' ? 'Aguardando PIX' :
                                 s.status === 'active'           ? 'Inscrito' :
                                 s.status === 'confirmed'        ? 'Confirmado' : 'Cancelado'}
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

      {tab === 'responsaveis' && (
        <div>
        
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 mb-8">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              {sellerEditId ? 'Editar responsável' : 'Adicionar responsável'}
            </h2>

            <div className="grid gap-4">
             
              {!sellerEditId ? (
                <div>
                  <label className="text-xs font-medium text-zinc-500 mb-1 block">Usuário *</label>
                  <div className="flex flex-col gap-2">
                    <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Buscar por nome..." className={inputCls} />
                    {userSearch.trim().length > 0 && (
                      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden max-h-48 overflow-y-auto">
                        {availableUsers.length === 0 ? (
                          <p className="px-4 py-3 text-sm text-zinc-400">Nenhum usuário encontrado.</p>
                        ) : availableUsers.slice(0, 8).map(u => (
                          <button key={u.id} type="button" onClick={() => { setSellerForm(f => ({ ...f, userId: u.id })); setUserSearch(u.name) }}
                            className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition ${sellerForm.userId === u.id ? 'bg-zinc-50 dark:bg-zinc-800' : ''}`}>
                            <UserAvatar src={u.avatar_url} name={u.name} className="h-7 w-7 shrink-0" />
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">{u.name}</span>
                            {sellerForm.userId === u.id && <svg className="ml-auto text-[#2F9E41]" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                          </button>
                        ))}
                      </div>
                    )}
                    {sellerForm.userId && !userSearch.trim() && (
                      <p className="text-xs text-zinc-400">Usuário selecionado: <strong className="text-zinc-700 dark:text-zinc-300">{allUsers.find(u => u.id === sellerForm.userId)?.name}</strong></p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 px-4 py-3">
                  <UserAvatar src={sellers.find(s => s.user_id === sellerEditId)?.users?.avatar_url} name={sellers.find(s => s.user_id === sellerEditId)?.users?.name ?? '?'} className="h-8 w-8 shrink-0" />
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{sellers.find(s => s.user_id === sellerEditId)?.users?.name}</span>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-medium text-zinc-500 mb-1 block">WhatsApp *</label>
                  <input value={sellerForm.whatsapp} onChange={e => setSellerForm(f => ({ ...f, whatsapp: e.target.value }))} className={inputCls} placeholder="5511999999999" inputMode="numeric" />
                  <p className="text-[10px] text-zinc-400 mt-1">Com DDI e DDD, sem espaços</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500 mb-1 block">Chave PIX</label>
                  <input value={sellerForm.pix_key} onChange={e => setSellerForm(f => ({ ...f, pix_key: e.target.value }))} className={inputCls} placeholder="email, CPF ou telefone" />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500 mb-1 block">% do sinal</label>
                  <input value={sellerForm.deposit_percent} onChange={e => setSellerForm(f => ({ ...f, deposit_percent: e.target.value }))} className={inputCls} type="number" min={1} max={100} placeholder="50" />
                  <p className="text-[10px] text-zinc-400 mt-1">Aplicado nas compras coletivas</p>
                </div>
              </div>
            </div>

            {sellerError && <p className="mt-3 text-sm text-red-600">{sellerError}</p>}

            <div className="mt-4 flex gap-2">
              <button onClick={saveSeller} disabled={sellerSaving || !sellerForm.userId}
                className="rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-50 transition hover:opacity-90" style={{ backgroundColor: '#2F9E41' }}>
                {sellerSaving ? 'Salvando...' : sellerEditId ? 'Salvar alterações' : 'Adicionar responsável'}
              </button>
              {sellerEditId && (
                <button onClick={resetSellerForm} className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition">Cancelar</button>
              )}
            </div>
          </div>

         
          {!sellersLoaded ? (
            <p className="text-sm text-zinc-400 text-center py-8">Carregando...</p>
          ) : sellers.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-12">Nenhum responsável cadastrado ainda.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {sellers.map(s => (
                <div key={s.user_id} className="flex items-center gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                  <UserAvatar src={s.users?.avatar_url} name={s.users?.name ?? '?'} className="h-10 w-10 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{s.users?.name ?? s.user_id}</p>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-zinc-500">
                      {s.whatsapp ? (
                        <span className="flex items-center gap-1">
                          <svg width={11} height={11} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                          {s.whatsapp}
                        </span>
                      ) : <span className="text-amber-500">⚠ Sem WhatsApp</span>}
                      {s.pix_key ? (
                        <span>PIX: {s.pix_key}</span>
                      ) : <span className="text-amber-500">⚠ Sem PIX</span>}
                      <span>Sinal: {s.deposit_percent}%</span>
                      <span className="text-zinc-400">{items.filter(i => i.seller_id === s.user_id).length} produto(s)</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => startEditSeller(s)} className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition">Editar</button>
                    <button onClick={() => deleteSeller(s.user_id)} className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition">Remover</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

