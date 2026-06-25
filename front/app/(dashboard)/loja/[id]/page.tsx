'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
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
  seller_id: string | null
  seller: SellerData | null
}

type MySignup = { size: string; status: string }

function fmtPrice(v: number) {
  return v === 0 ? 'Gratis' : `R$ ${v.toFixed(2).replace('.', ',')}`
}

function sellerProfile(item: StoreItem) {
  return item.seller?.store_seller_profiles?.[0] ?? null
}

function whatsappUrl(phone: string, msg: string) {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
}

export default function LojaProdutoPage() {
  const params = useParams<{ id: string }>()
  const itemId = params.id

  const [item, setItem] = useState<StoreItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [userName, setUserName] = useState('')
  const [qty, setQty] = useState(1)
  const [orderSaving, setOrderSaving] = useState(false)
  const [signupCount, setSignupCount] = useState(0)
  const [mySignup, setMySignup] = useState<MySignup | null>(null)
  const [selectedSize, setSelectedSize] = useState('')
  const [signupSaving, setSignupSaving] = useState(false)
  const [pixCopied, setPixCopied] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function loadProduct() {
      setLoading(true)
      const [
        { data: itemData },
        { data: { user: authUser } },
      ] = await Promise.all([
        supabase.from('store_items')
          .select('id, name, description, price, image_url, category, type, min_quantity, sizes, seller_id, seller:users!seller_id(id, name, avatar_url, store_seller_profiles(whatsapp, pix_key, deposit_percent))')
          .eq('id', itemId)
          .eq('is_visible', true)
          .maybeSingle(),
        supabase.auth.getUser(),
      ])

      const loadedItem = itemData as unknown as StoreItem | null
      setItem(loadedItem)
      setUser(authUser)
      setSelectedSize(loadedItem?.sizes?.[0] ?? '')

      if (authUser) {
        supabase.from('users').select('name').eq('id', authUser.id).maybeSingle()
          .then(({ data }) => { if (data?.name) setUserName(data.name) })
      }

      if (loadedItem?.type === 'collective') {
        const [{ data: signups }, { data: mine }] = await Promise.all([
          supabase.from('store_signups').select('item_id').eq('item_id', loadedItem.id).neq('status', 'cancelled'),
          authUser
            ? supabase.from('store_signups').select('size, status').eq('item_id', loadedItem.id).eq('user_id', authUser.id).neq('status', 'cancelled').maybeSingle()
            : Promise.resolve({ data: null as { size: string | null; status: string } | null }),
        ])
        setSignupCount((signups ?? []).length)
        setMySignup(mine ? { size: mine.size ?? '', status: mine.status } : null)
        if (mine?.size) setSelectedSize(mine.size)
      }

      setLoading(false)
    }

    if (itemId) void loadProduct()
  }, [itemId])

  const sp = item ? sellerProfile(item) : null
  const depositAmt = item ? item.price * (sp?.deposit_percent ?? 50) / 100 : 0
  const progress = item?.type === 'collective' ? Math.min(100, (signupCount / item.min_quantity) * 100) : 0
  const reached = item?.type === 'collective' ? signupCount >= item.min_quantity : false

  const orderMessage = useMemo(() => {
    if (!item) return ''
    return [
      'Ola! Gostaria de fazer um pedido na Loja ADS Conecta:',
      '',
      `*Produto:* ${item.name}`,
      `*Quantidade:* ${qty}`,
      `*Total:* ${fmtPrice(item.price * qty)}`,
      userName ? `*Nome:* ${userName}` : null,
    ].filter(Boolean).join('\n')
  }, [item, qty, userName])

  function copyPix(key: string) {
    navigator.clipboard.writeText(key)
    setPixCopied(true)
    setTimeout(() => setPixCopied(false), 2000)
  }

  async function placeOrder() {
    if (!item || !user) return
    const phone = sp?.whatsapp?.replace(/\D/g, '')
    if (!phone) {
      setMessage('Este vendedor ainda nao tem WhatsApp cadastrado.')
      return
    }

    setOrderSaving(true)
    await supabase.from('store_orders').insert({
      user_id: user.id,
      items: [{ id: item.id, name: item.name, price: item.price, qty }],
      total: item.price * qty,
      status: 'pending',
    })
    setOrderSaving(false)
    window.location.href = whatsappUrl(phone, orderMessage)
  }

  async function submitSignup() {
    if (!item || !user) return
    setSignupSaving(true)
    const isNew = !mySignup
    const nextStatus = sp?.pix_key ? 'awaiting_payment' : 'active'
    const { error } = await supabase.from('store_signups').upsert(
      { user_id: user.id, item_id: item.id, size: selectedSize || null, status: nextStatus },
      { onConflict: 'user_id,item_id' }
    )
    if (!error) {
      setMySignup({ size: selectedSize, status: nextStatus })
      if (isNew) setSignupCount(c => c + 1)
      setMessage(sp?.pix_key ? 'Inscricao salva. Envie o sinal pelo PIX para confirmar.' : 'Inscricao salva.')
    }
    setSignupSaving(false)
  }

  async function cancelSignup() {
    if (!item || !user) return
    await supabase.from('store_signups').update({ status: 'cancelled' }).eq('user_id', user.id).eq('item_id', item.id)
    setMySignup(null)
    setSignupCount(c => Math.max(0, c - 1))
    setMessage('Inscricao cancelada.')
  }

  function sendProof() {
    if (!item || !sp?.whatsapp) return
    const msg = [
      'Ola! Estou enviando o comprovante do sinal referente ao meu pedido:',
      '',
      `Produto: ${item.name}`,
      selectedSize ? `Tamanho: ${selectedSize}` : null,
      `Valor enviado: ${fmtPrice(depositAmt)} (${sp.deposit_percent ?? 50}% de ${fmtPrice(item.price)})`,
      userName ? `Nome: ${userName}` : null,
    ].filter(Boolean).join('\n')
    window.location.href = whatsappUrl(sp.whatsapp, msg)
  }

  if (loading) {
    return (
      <div className="px-4 md:px-6 py-8 w-full max-w-5xl mx-auto">
        <div className="h-4 w-28 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse mb-6" />
        <div className="grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="aspect-square rounded-2xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            <div className="h-5 w-24 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            <div className="h-28 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="px-4 md:px-6 py-16 w-full max-w-3xl mx-auto text-center">
        <p className="text-sm text-zinc-400">Produto nao encontrado.</p>
        <Link href="/loja" className="mt-4 inline-flex rounded-xl px-4 py-2 text-sm font-bold text-white" style={{ backgroundColor: '#2F9E41' }}>
          Voltar para loja
        </Link>
      </div>
    )
  }

  return (
    <div className="px-4 md:px-6 py-8 w-full max-w-5xl mx-auto">
      <Link href="/loja" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition">
        <span aria-hidden>←</span>
        Voltar para loja
      </Link>

      <div className="grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-zinc-50 dark:bg-zinc-800">
          {item.image_url ? (
            <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="(min-width: 768px) 55vw, 100vw" priority />
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-200 dark:text-zinc-700">
              <IconBag size={64} />
            </div>
          )}
          {item.type === 'collective' && (
            <span className="absolute left-3 top-3 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white">Compra coletiva</span>
          )}
          {item.category && (
            <span className="absolute right-3 top-3 rounded-full bg-white/90 dark:bg-zinc-900/90 px-3 py-1 text-xs font-semibold text-zinc-500 backdrop-blur-sm">{item.category}</span>
          )}
        </div>

        <section className="flex flex-col gap-5">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{item.name}</h1>
            <p className="mt-2 text-2xl font-bold" style={{ color: '#2F9E41' }}>{fmtPrice(item.price)}</p>
          </div>

          {item.seller && (
            <div className="flex items-center gap-3 rounded-xl border border-zinc-100 dark:border-zinc-800 p-3">
              <div className="relative h-11 w-11 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                {item.seller.avatar_url ? <Image src={item.seller.avatar_url} alt={item.seller.name} fill className="object-cover" /> : <div className="flex h-full items-center justify-center text-zinc-400"><IconUser /></div>}
              </div>
              <div>
                <p className="text-xs text-zinc-400">Vendedor</p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.seller.name}</p>
              </div>
            </div>
          )}

          {item.description && (
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Descricao</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-600 dark:text-zinc-300">{item.description}</p>
            </div>
          )}

          {item.type === 'normal' ? (
            <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Quantidade</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition">-</button>
                  <span className="min-w-8 text-center text-sm font-bold text-zinc-900 dark:text-zinc-100">{qty}</span>
                  <button onClick={() => setQty(q => q + 1)} className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition">+</button>
                </div>
              </div>
              <div className="mb-4 flex items-center justify-between text-sm">
                <span className="text-zinc-500">Total</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{fmtPrice(item.price * qty)}</span>
              </div>
              {!user ? (
                <Link href="/login" className="block w-full rounded-xl py-3 text-center text-sm font-bold text-white" style={{ backgroundColor: '#2F9E41' }}>
                  Entre para pedir via WhatsApp
                </Link>
              ) : (
                <button onClick={placeOrder} disabled={orderSaving} className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: '#2F9E41' }}>
                  <IconWhatsApp />
                  {orderSaving ? 'Registrando...' : 'Pedir via WhatsApp'}
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-900/40 dark:bg-zinc-900">
              <div className="mb-3 flex justify-between text-xs text-zinc-500">
                <span>{signupCount} inscrito{signupCount !== 1 ? 's' : ''}</span>
                <span>min. {item.min_quantity}</span>
              </div>
              <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-700">
                <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: reached ? '#2F9E41' : '#f59e0b' }} />
              </div>
              {reached && <p className="mt-2 text-xs font-semibold" style={{ color: '#2F9E41' }}>Meta atingida!</p>}

              {item.sizes.length > 0 && (
                <div className="mt-4">
                  <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">Tamanho</label>
                  <div className="flex flex-wrap gap-2">
                    {item.sizes.map(size => (
                      <button key={size} onClick={() => setSelectedSize(size)} className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${selectedSize === size ? 'border-amber-500 bg-amber-100 text-amber-800' : 'border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900'}`}>
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4">
                {!user ? (
                  <Link href="/login" className="block w-full rounded-xl py-3 text-center text-sm font-bold text-white" style={{ backgroundColor: '#f59e0b' }}>
                    Entre para participar
                  </Link>
                ) : mySignup ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Voce esta inscrito{mySignup.size ? ` - ${mySignup.size}` : ''}.</p>
                    <div className="flex gap-2">
                      <button onClick={submitSignup} disabled={signupSaving} className="flex-1 rounded-xl border border-zinc-200 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                        Atualizar
                      </button>
                      <button onClick={cancelSignup} className="rounded-xl border border-red-100 px-4 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-50">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={submitSignup} disabled={signupSaving} className="w-full rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: '#f59e0b' }}>
                    {signupSaving ? 'Salvando...' : 'Quero participar'}
                  </button>
                )}
              </div>

              {sp?.pix_key && mySignup && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-white p-3 dark:border-amber-900/40 dark:bg-zinc-950">
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Pagamento do sinal</p>
                  <p className="mt-1 text-xs text-zinc-500">Envie {fmtPrice(depositAmt)} ({sp.deposit_percent ?? 50}% do valor) para confirmar sua participacao.</p>
                  <button onClick={() => copyPix(sp.pix_key!)} className="mt-3 w-full rounded-lg border border-amber-200 px-3 py-2 text-left text-xs font-semibold text-zinc-700 transition hover:bg-amber-50 dark:border-amber-900/40 dark:text-zinc-200">
                    PIX: {pixCopied ? 'Copiado!' : sp.pix_key}
                  </button>
                  {sp.whatsapp && (
                    <button onClick={sendProof} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold text-white" style={{ backgroundColor: '#25D366' }}>
                      <IconWhatsApp />
                      Enviar comprovante
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {message && <p className="rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:bg-zinc-800">{message}</p>}
        </section>
      </div>
    </div>
  )
}

function IconBag({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}

function IconUser() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx={12} cy={7} r={4} />
    </svg>
  )
}

function IconWhatsApp() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.52 3.48A11.82 11.82 0 0 0 12.08 0C5.5 0 .15 5.35.15 11.93c0 2.1.55 4.15 1.6 5.96L.05 24l6.25-1.64a11.9 11.9 0 0 0 5.78 1.47h.01c6.58 0 11.93-5.35 11.93-11.93 0-3.19-1.24-6.18-3.5-8.42ZM12.09 21.8h-.01a9.9 9.9 0 0 1-5.05-1.38l-.36-.21-3.7.97.99-3.61-.23-.37a9.85 9.85 0 0 1-1.51-5.27c0-5.45 4.43-9.88 9.88-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.44-4.43 9.87-9.89 9.87Zm5.42-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.04-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35Z" />
    </svg>
  )
}
