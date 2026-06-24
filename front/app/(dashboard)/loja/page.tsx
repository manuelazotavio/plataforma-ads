import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'

export const dynamic = 'force-dynamic'

type StoreItem = {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
}

export default async function LojaPage() {
  const { data } = await supabase
    .from('store_items')
    .select('id, name, description, price, image_url')
    .eq('is_visible', true)
    .order('display_order')
    .order('created_at')

  const items = (data ?? []) as StoreItem[]

  return (
    <div className="px-4 md:px-6 py-8 w-full max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Loja</h1>
        <p className="text-sm text-zinc-500 mt-1">{items.length} produto{items.length !== 1 ? 's' : ''} disponível{items.length !== 1 ? 'eis' : ''}</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700 p-20 text-center">
          <p className="text-sm text-zinc-400">Nenhum produto disponível no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {items.map(item => (
            <div key={item.id} className="group rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex flex-col">
              <div className="relative aspect-square bg-zinc-50 dark:bg-zinc-800">
                {item.image_url ? (
                  <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-zinc-200 dark:text-zinc-700">
                    <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                      <line x1={3} y1={6} x2={21} y2={6} />
                      <path d="M16 10a4 4 0 0 1-8 0" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1 p-3 flex-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2">{item.name}</p>
                {item.description && (
                  <p className="text-xs text-zinc-400 line-clamp-2 leading-snug">{item.description}</p>
                )}
                <p className="mt-auto pt-2 text-sm font-bold" style={{ color: '#2F9E41' }}>
                  {item.price === 0 ? 'Grátis' : `R$ ${item.price.toFixed(2).replace('.', ',')}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
