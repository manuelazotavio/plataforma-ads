'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/app/lib/supabase'



type SellerData = {
  id: string
  name: string
  avatar_url: string | null
  store_seller_profiles: { whatsapp: string | null; pix_key: string | null; deposit_percent: number }[]
}

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
  collective_deadline: string | null
  seller_id: string | null
  seller: SellerData | null
}

type CartItem = StoreItem & { qty: number }
type MySignup = { size: string; status: string }
type CheckoutGroup = { sellerName: string; whatsapp: string | null; msg: string; total: number }



function fmtPrice(v: number) {
  return v === 0 ? 'Grátis' : `R$ ${v.toFixed(2).replace('.', ',')}`
}

function sellerProfile(item: StoreItem) {
  return item.seller?.store_seller_profiles?.[0] ?? null
}

function openWhatsAppGroup(group: CheckoutGroup) {
  const phone = group.whatsapp?.replace(/\D/g, '')
  if (!phone) return false
  window.location.href = `https://wa.me/${phone}?text=${encodeURIComponent(group.msg)}`
  return true
}



export default function LojaPage() {
  const [items, setItems] = useState<StoreItem[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  
  const [signupCounts, setSignupCounts] = useState<Record<string, number>>({})
  const [mySignups, setMySignups] = useState<Record<string, MySignup>>({})


  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [orderSaving, setOrderSaving] = useState(false)
  const [checkoutGroups, setCheckoutGroups] = useState<CheckoutGroup[] | null>(null)

 
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const drawerRef = useRef<HTMLDivElement>(null)
  const checkoutModalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (checkoutGroups?.length !== 1) return
    openWhatsAppGroup(checkoutGroups[0])
  }, [checkoutGroups])

  

  useEffect(() => {
    async function init() {
      const [
        { data: itemsData },
        { data: { user: authUser } },
      ] = await Promise.all([
        supabase.from('store_items')
          .select('id, name, description, price, image_url, category, type, min_quantity, sizes, collective_deadline, seller_id, seller:users!seller_id(id, name, avatar_url, store_seller_profiles(whatsapp, pix_key, deposit_percent))')
          .eq('is_visible', true).order('display_order').order('created_at'),
        supabase.auth.getUser(),
      ])

      const loadedItems = (itemsData ?? []) as unknown as StoreItem[]
      setItems(loadedItems)
      setUser(authUser)

      const collectiveIds = loadedItems.filter(i => i.type === 'collective').map(i => i.id)
      if (collectiveIds.length > 0) {
        const [{ data: allSignups }, { data: mySignupData }] = await Promise.all([
          supabase.from('store_signups').select('item_id').in('item_id', collectiveIds).neq('status', 'cancelled'),
          authUser
            ? supabase.from('store_signups').select('item_id, size, status').in('item_id', collectiveIds).eq('user_id', authUser.id).neq('status', 'cancelled')
            : Promise.resolve({ data: [] as { item_id: string; size: string | null; status: string }[] }),
        ])
        const counts: Record<string, number> = {}
        for (const s of (allSignups ?? []) as { item_id: string }[]) counts[s.item_id] = (counts[s.item_id] ?? 0) + 1
        setSignupCounts(counts)
        const mine: Record<string, MySignup> = {}
        for (const s of (mySignupData ?? []) as { item_id: string; size: string | null; status: string }[]) {
          mine[s.item_id] = { size: s.size ?? '', status: s.status }
        }
        setMySignups(mine)
      }

      setLoading(false)
    }
    void init()
  }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      const t = e.target as Node
      if (cartOpen && drawerRef.current && !drawerRef.current.contains(t)) setCartOpen(false)
      if (checkoutGroups && checkoutModalRef.current && !checkoutModalRef.current.contains(t)) setCheckoutGroups(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [cartOpen, checkoutGroups])

  

  const categories = useMemo(() => {
    const set = new Set(items.map(i => i.category).filter(Boolean) as string[])
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [items])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(item => {
      if (activeCategory && item.category !== activeCategory) return false
      if (q && !item.name.toLowerCase().includes(q) && !(item.description ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [items, search, activeCategory])

  

  function addToCart(item: StoreItem) {
    setCart(prev => {
      const ex = prev.find(c => c.id === item.id)
      return ex ? prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c) : [...prev, { ...item, qty: 1 }]
    })
    setCartOpen(true)
  }

  function changeQty(id: string, delta: number) {
    setCart(prev => prev.flatMap(c => {
      if (c.id !== id) return [c]
      const n = c.qty + delta
      return n <= 0 ? [] : [{ ...c, qty: n }]
    }))
  }

  const cartCount = cart.reduce((s, c) => s + c.qty, 0)
  const cartTotal = cart.reduce((s, c) => s + c.price * c.qty, 0)

  async function placeOrder() {
    if (!user) return
    setOrderSaving(true)
    setCheckoutGroups(null)

    
    const groups = new Map<string, CartItem[]>()
    for (const item of cart) {
      const key = item.seller_id ?? '__none__'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(item)
    }

    
    for (const [, groupItems] of groups) {
      const total = groupItems.reduce((s, i) => s + i.price * i.qty, 0)
      supabase.from('store_orders').insert({
        user_id: user.id,
        items: groupItems.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
        total, status: 'pending',
      })
    }

    
    const whatsappGroups: CheckoutGroup[] = []
    for (const [, groupItems] of groups) {
      const sp = sellerProfile(groupItems[0])
      const whatsapp = sp?.whatsapp ?? null
      const sellerName = groupItems[0].seller?.name ?? 'Vendedor'
      const total = groupItems.reduce((s, i) => s + i.price * i.qty, 0)
      const lines = groupItems.map(i => `• ${i.qty}x ${i.name} — ${fmtPrice(i.price)}`)
      const msg = `Olá! Gostaria de fazer um pedido na Loja ADS Conecta:\n\n${lines.join('\n')}\n\n*Total: ${fmtPrice(total)}*`
      whatsappGroups.push({ sellerName, whatsapp, msg, total })
    }

    setCart([])
    setCartOpen(false)
    setOrderSaving(false)

    if (whatsappGroups.length === 1 && openWhatsAppGroup(whatsappGroups[0])) {
      setCheckoutGroups(null)
    } else {
      setCheckoutGroups(whatsappGroups)
    }
  }

  return (
    <div className="relative px-4 md:px-6 py-8 w-full max-w-5xl mx-auto">

     
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Loja</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{filtered.length} produto{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setCartOpen(true)}
          className="relative flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition">
          <IconCart />
          Carrinho
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: '#2F9E41' }}>
              {cartCount > 9 ? '9+' : cartCount}
            </span>
          )}
        </button>
      </div>

      
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx={11} cy={11} r={8}/><path d="m21 21-4.35-4.35"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produto..."
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 pl-9 pr-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-400 transition placeholder:text-zinc-400" />
        </div>
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Chip active={!activeCategory} onClick={() => setActiveCategory(null)}>Todos</Chip>
            {categories.map(cat => (
              <Chip key={cat} active={activeCategory === cat} onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}>{cat}</Chip>
            ))}
          </div>
        )}
      </div>

   
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden animate-pulse">
              <div className="aspect-square bg-zinc-100 dark:bg-zinc-800" />
              <div className="p-3 flex flex-col gap-2">
                <div className="h-3.5 w-3/4 rounded bg-zinc-100 dark:bg-zinc-800" />
                <div className="h-3 w-1/2 rounded bg-zinc-100 dark:bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700 py-20 text-center">
          <p className="text-sm text-zinc-400">Nenhum produto encontrado.</p>
          {(search || activeCategory) && (
            <button onClick={() => { setSearch(''); setActiveCategory(null) }} className="mt-3 text-sm font-medium" style={{ color: '#2F9E41' }}>Limpar filtros</button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {filtered.map(item => {
            const sp = sellerProfile(item)

            if (item.type === 'collective') {
              const count = signupCounts[item.id] ?? 0
              const progress = Math.min(100, (count / item.min_quantity) * 100)
              const reached = count >= item.min_quantity
              const mySignup = mySignups[item.id]
              const depositAmt = item.price * (sp?.deposit_percent ?? 50) / 100

              return (
                <div key={item.id} className="flex flex-col rounded-2xl border border-zinc-100 bg-white dark:bg-zinc-900 dark:border-zinc-800 overflow-hidden transition hover:shadow-md hover:border-zinc-200">
                  <Link href={`/loja/${item.id}`} className="relative block aspect-square bg-zinc-50 dark:bg-zinc-800">
                    {item.image_url ? <Image src={item.image_url} alt={item.name} fill className="object-cover" /> : <div className="flex h-full items-center justify-center text-zinc-200 dark:text-zinc-700"><IconBag size={36} /></div>}
                    <span className="absolute top-2 left-2 rounded-full px-2 py-0.5 text-[9px] font-bold text-white" style={{ backgroundColor: '#2F9E41' }}>Compra coletiva</span>
                    {item.category && <span className="absolute top-2 right-2 rounded-full bg-white/90 dark:bg-zinc-900/90 px-2 py-0.5 text-[10px] font-semibold text-zinc-500 backdrop-blur-sm">{item.category}</span>}
                  </Link>
                  <div className="flex flex-col gap-2 p-3 flex-1">
                    <Link href={`/loja/${item.id}`} className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2 hover:underline">{item.name}</Link>
                    <div className="flex items-baseline gap-1.5">
                      <p className="text-sm font-bold" style={{ color: '#2F9E41' }}>{fmtPrice(item.price)}</p>
                      {sp?.pix_key && <p className="text-[10px] text-zinc-400">sinal: {fmtPrice(depositAmt)}</p>}
                    </div>
                    {item.seller && (
                      <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                        <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx={12} cy={7} r={4}/></svg>
                        {item.seller.name}
                      </p>
                    )}

                 
                    <div>
                      <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                        <span>{count} inscrito{count !== 1 ? 's' : ''}</span>
                        <span>min. {item.min_quantity}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700">
                        <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: '#2F9E41' }} />
                      </div>
                      {reached && <p className="text-[10px] font-semibold mt-0.5" style={{ color: '#2F9E41' }}>Meta atingida!</p>}
                    </div>

                    
                    <div className="mt-auto pt-1">
                      {!user ? (
                        <Link href="/login" className="block text-center w-full rounded-lg border border-zinc-200 py-1.5 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-50 transition">
                          Entre para participar
                        </Link>
                      ) : mySignup ? (
                        <div className="flex flex-col gap-1.5">
                          {mySignup.status === 'awaiting_payment' ? (
                            <>
                              <p className="text-[10px] font-semibold text-zinc-500">Aguardando confirmação do PIX</p>
                              {sp?.pix_key && (
                                <Link href={`/loja/${item.id}`} className="block w-full rounded-lg border py-1.5 text-center text-[10px] font-semibold transition hover:opacity-90" style={{ borderColor: '#2F9E41', color: '#2F9E41' }}>
                                  Ver instruções de pagamento
                                </Link>
                              )}
                            </>
                          ) : (
                            <p className="text-[11px] font-semibold text-green-700">Inscrito{mySignup.size ? ` - ${mySignup.size}` : ''}</p>
                          )}
                          <Link href={`/loja/${item.id}`} className="block w-full rounded-lg py-1 text-center text-[10px] font-semibold text-zinc-600 border border-zinc-200 hover:bg-zinc-50 transition">
                            Alterar inscrição
                          </Link>
                        </div>
                      ) : (
                        <Link href={`/loja/${item.id}`} className="block w-full rounded-lg py-1.5 text-center text-[11px] font-semibold text-white transition hover:opacity-90" style={{ backgroundColor: '#2F9E41' }}>
                          Quero participar
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            }

            
            const inCart = cart.find(c => c.id === item.id)
            return (
              <div key={item.id} className="group flex flex-col rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden transition hover:shadow-md hover:border-zinc-200">
                <Link href={`/loja/${item.id}`} className="relative block aspect-square bg-zinc-50 dark:bg-zinc-800">
                  {item.image_url ? <Image src={item.image_url} alt={item.name} fill className="object-cover" /> : <div className="flex h-full items-center justify-center text-zinc-200 dark:text-zinc-700"><IconBag size={36} /></div>}
                  {item.category && <span className="absolute top-2 left-2 rounded-full bg-white/90 dark:bg-zinc-900/90 px-2 py-0.5 text-[10px] font-semibold text-zinc-500 backdrop-blur-sm">{item.category}</span>}
                </Link>
                <div className="flex flex-col gap-1 p-3 flex-1">
                  <Link href={`/loja/${item.id}`} className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2 hover:underline">{item.name}</Link>
                  {item.description && <p className="text-xs text-zinc-400 line-clamp-2 leading-snug">{item.description}</p>}
                  {item.seller && (
                    <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                      <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx={12} cy={7} r={4}/></svg>
                      {item.seller.name}
                    </p>
                  )}
                  <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-bold" style={{ color: '#2F9E41' }}>{fmtPrice(item.price)}</p>
                    <button onClick={() => addToCart(item)} aria-label="Adicionar ao carrinho" className="relative flex h-8 w-8 items-center justify-center rounded-lg text-white transition hover:opacity-90" style={{ backgroundColor: '#2F9E41' }}>
                      <IconCart size={15} />
                      {inCart && (
                        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-zinc-900 px-1 text-[9px] font-bold leading-none text-white dark:border-zinc-900">
                          {inCart.qty > 9 ? '9+' : inCart.qty}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

    
      {(cartOpen || !!checkoutGroups) && (
        <div className="fixed inset-0 z-40 bg-black/40" />
      )}

     
      <div ref={drawerRef}
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-white dark:bg-zinc-900 shadow-2xl flex flex-col transition-transform duration-300 ${cartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-5 py-4">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <IconCart />
            Carrinho
            {cartCount > 0 && <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: '#2F9E41' }}>{cartCount}</span>}
          </h2>
          <button onClick={() => setCartOpen(false)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><line x1={18} y1={6} x2={6} y2={18}/><line x1={6} y1={6} x2={18} y2={18}/></svg>
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-6">
            <div className="text-zinc-200 dark:text-zinc-700"><IconBag size={48} /></div>
            <p className="text-sm text-zinc-400">Seu carrinho está vazio.</p>
            <button onClick={() => setCartOpen(false)} className="text-sm font-semibold" style={{ color: '#2F9E41' }}>Explorar produtos</button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
              {cart.map(item => (
                <div key={item.id} className="flex gap-3">
                  <div className="relative h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    {item.image_url ? <Image src={item.image_url} alt={item.name} fill className="object-cover" /> : <div className="flex h-full items-center justify-center text-zinc-300"><IconBag size={22} /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2">{item.name}</p>
                    {item.seller && <p className="text-[10px] text-zinc-400 mt-0.5">{item.seller.name}</p>}
                    <p className="text-sm font-bold mt-1" style={{ color: '#2F9E41' }}>{fmtPrice(item.price)}</p>
                  </div>
                  <div className="flex flex-col items-end justify-between shrink-0">
                    <button onClick={() => changeQty(item.id, -item.qty)} className="text-zinc-300 hover:text-red-400 transition">
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><line x1={18} y1={6} x2={6} y2={18}/><line x1={6} y1={6} x2={18} y2={18}/></svg>
                    </button>
                    <div className="flex items-center gap-2">
                      <button onClick={() => changeQty(item.id, -1)} className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 transition text-sm font-bold">-</button>
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 min-w-[16px] text-center">{item.qty}</span>
                      <button onClick={() => changeQty(item.id, 1)} className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 transition text-sm font-bold">+</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-zinc-100 dark:border-zinc-800 px-5 py-4 flex flex-col gap-3">
             
              {new Set(cart.map(i => i.seller_id)).size > 1 && (
                <p className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2">
                  Seu carrinho tem itens de {new Set(cart.map(i => i.seller_id)).size} vendedores diferentes. Você enviará um WhatsApp para cada um.
                </p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Subtotal ({cartCount} {cartCount === 1 ? 'item' : 'itens'})</span>
                <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">{fmtPrice(cartTotal)}</span>
              </div>
              {!user ? (
                <Link href="/login" className="w-full rounded-xl py-3 text-sm font-bold text-white text-center block" style={{ backgroundColor: '#2F9E41' }}>
                  Entre para pedir via WhatsApp
                </Link>
              ) : (
                <button onClick={placeOrder} disabled={orderSaving}
                  className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 transition" style={{ backgroundColor: '#2F9E41' }}>
                  <IconWhatsApp />
                  {orderSaving ? 'Registrando...' : 'Pedir via WhatsApp'}
                </button>
              )}
              <button onClick={() => setCart([])} className="text-center text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition">Limpar carrinho</button>
            </div>
          </>
        )}
      </div>

     
      {checkoutGroups && !(checkoutGroups.length === 1 && checkoutGroups[0].whatsapp?.replace(/\D/g, '')) && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div ref={checkoutModalRef} className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl p-6">
            <div className="text-center mb-5">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Enviar pedidos</h3>
              <p className="text-sm text-zinc-500 mt-1">Toque em cada botão para enviar o pedido ao vendedor correspondente.</p>
            </div>
            <div className="flex flex-col gap-3">
              {checkoutGroups.map((g, i) => (
                <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{g.sellerName}</p>
                    <p className="text-sm font-bold" style={{ color: '#2F9E41' }}>{fmtPrice(g.total)}</p>
                  </div>
                  {g.whatsapp ? (
                    <button
                      onClick={() => { openWhatsAppGroup(g) }}
                      className="w-full rounded-xl py-2.5 text-sm font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 transition"
                      style={{ backgroundColor: '#25D366' }}>
                      <IconWhatsApp />
                      Enviar para {g.sellerName}
                    </button>
                  ) : (
                    <p className="text-xs text-center text-zinc-400">Vendedor sem WhatsApp cadastrado.</p>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => setCheckoutGroups(null)} className="w-full text-center text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition py-3 mt-2">
              Fechar
            </button>
          </div>
        </div>
      )}

    </div>
  )
}



function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${active ? 'border-transparent text-white' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 hover:border-zinc-300'}`}
      style={active ? { backgroundColor: '#2F9E41' } : {}}>
      {children}
    </button>
  )
}

function IconBag({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1={3} y1={6} x2={21} y2={6}/><path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  )
}

function IconCart({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={8} cy={21} r={1} />
      <circle cx={19} cy={21} r={1} />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h8.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  )
}

function IconWhatsApp() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
    </svg>
  )
}
