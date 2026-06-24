'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'

type StoreItem = {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  category: string | null
}

type CartItem = StoreItem & { qty: number }

function fmtPrice(price: number) {
  return price === 0 ? 'Grátis' : `R$ ${price.toFixed(2).replace('.', ',')}`
}

export default function LojaPage() {
  const [items, setItems] = useState<StoreItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase
      .from('store_items')
      .select('id, name, description, price, image_url, category')
      .eq('is_visible', true)
      .order('display_order')
      .order('created_at')
      .then(({ data }) => { setItems((data ?? []) as StoreItem[]); setLoading(false) })
  }, [])

  
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (cartOpen && drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setCartOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [cartOpen])

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
      const existing = prev.find(c => c.id === item.id)
      if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { ...item, qty: 1 }]
    })
    setCartOpen(true)
  }

  function changeQty(id: string, delta: number) {
    setCart(prev =>
      prev.flatMap(c => {
        if (c.id !== id) return [c]
        const next = c.qty + delta
        return next <= 0 ? [] : [{ ...c, qty: next }]
      })
    )
  }

  function removeFromCart(id: string) {
    setCart(prev => prev.filter(c => c.id !== id))
  }

  const cartCount = cart.reduce((s, c) => s + c.qty, 0)
  const cartTotal = cart.reduce((s, c) => s + c.price * c.qty, 0)

  return (
    <div className="relative px-4 md:px-6 py-8 w-full max-w-5xl mx-auto">

     
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Loja</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{filtered.length} produto{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setCartOpen(true)}
          className="relative flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
        >
          <IconBag />
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
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 pl-9 pr-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition placeholder:text-zinc-400"
          />
        </div>
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${!activeCategory ? 'border-transparent text-white' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 hover:border-zinc-300'}`}
              style={!activeCategory ? { backgroundColor: '#2F9E41' } : {}}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${activeCategory === cat ? 'border-transparent text-white' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 hover:border-zinc-300'}`}
                style={activeCategory === cat ? { backgroundColor: '#2F9E41' } : {}}
              >
                {cat}
              </button>
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
            <button onClick={() => { setSearch(''); setActiveCategory(null) }} className="mt-3 text-sm font-medium" style={{ color: '#2F9E41' }}>
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {filtered.map(item => {
            const inCart = cart.find(c => c.id === item.id)
            return (
              <div key={item.id} className="group flex flex-col rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden transition hover:shadow-md hover:border-zinc-200 dark:hover:border-zinc-700">
                <div className="relative aspect-square bg-zinc-50 dark:bg-zinc-800">
                  {item.image_url ? (
                    <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-zinc-200 dark:text-zinc-700">
                      <IconBag size={36} />
                    </div>
                  )}
                  {item.category && (
                    <span className="absolute top-2 left-2 rounded-full bg-white/90 dark:bg-zinc-900/90 px-2 py-0.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 backdrop-blur-sm">
                      {item.category}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1 p-3 flex-1">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2">{item.name}</p>
                  {item.description && (
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-snug">{item.description}</p>
                  )}
                  <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-bold" style={{ color: '#2F9E41' }}>{fmtPrice(item.price)}</p>
                    {inCart ? (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => changeQty(item.id, -1)} className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition text-sm font-bold leading-none">-</button>
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 min-w-[14px] text-center">{inCart.qty}</span>
                        <button onClick={() => changeQty(item.id, 1)} className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition text-sm font-bold leading-none">+</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(item)}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-white transition hover:opacity-90"
                        style={{ backgroundColor: '#2F9E41' }}
                      >
                        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                        Adicionar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      
      {cartOpen && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setCartOpen(false)} />
      )}

     
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-white dark:bg-zinc-900 shadow-2xl flex flex-col transition-transform duration-300 ${cartOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-5 py-4">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <IconBag />
            Carrinho
            {cartCount > 0 && <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: '#2F9E41' }}>{cartCount}</span>}
          </h2>
          <button onClick={() => setCartOpen(false)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <line x1={18} y1={6} x2={6} y2={18}/><line x1={6} y1={6} x2={18} y2={18}/>
            </svg>
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-6">
            <div className="text-zinc-200 dark:text-zinc-700"><IconBag size={48} /></div>
            <p className="text-sm text-zinc-400">Seu carrinho está vazio.</p>
            <button onClick={() => setCartOpen(false)} className="text-sm font-semibold" style={{ color: '#2F9E41' }}>
              Explorar produtos
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
              {cart.map(item => (
                <div key={item.id} className="flex gap-3">
                  <div className="relative h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    {item.image_url
                      ? <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                      : <div className="flex h-full items-center justify-center text-zinc-300 dark:text-zinc-600"><IconBag size={22} /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2">{item.name}</p>
                    {item.category && <p className="text-[11px] text-zinc-400 mt-0.5">{item.category}</p>}
                    <p className="text-sm font-bold mt-1" style={{ color: '#2F9E41' }}>{fmtPrice(item.price)}</p>
                  </div>
                  <div className="flex flex-col items-end justify-between shrink-0">
                    <button onClick={() => removeFromCart(item.id)} className="text-zinc-300 hover:text-red-400 transition">
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <line x1={18} y1={6} x2={6} y2={18}/><line x1={6} y1={6} x2={18} y2={18}/>
                      </svg>
                    </button>
                    <div className="flex items-center gap-2">
                      <button onClick={() => changeQty(item.id, -1)} className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition text-sm font-bold">-</button>
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 min-w-[16px] text-center">{item.qty}</span>
                      <button onClick={() => changeQty(item.id, 1)} className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition text-sm font-bold">+</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-zinc-100 dark:border-zinc-800 px-5 py-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Subtotal ({cartCount} {cartCount === 1 ? 'item' : 'itens'})</span>
                <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">{fmtPrice(cartTotal)}</span>
              </div>
              <button
                className="w-full rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90"
                style={{ backgroundColor: '#2F9E41' }}
                onClick={() => alert('Funcionalidade de pedido em breve!')}
              >
                Finalizar pedido
              </button>
              <button onClick={() => setCart([])} className="text-center text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition">
                Limpar carrinho
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function IconBag({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1={3} y1={6} x2={21} y2={6} />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}
