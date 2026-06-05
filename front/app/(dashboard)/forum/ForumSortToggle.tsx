'use client'

import { useRouter } from 'next/navigation'

type Props = {
  sort: string
  category?: string
}

export default function ForumSortToggle({ sort, category }: Props) {
  const router = useRouter()

  function navigate(newSort: string) {
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (newSort !== 'recentes') params.set('sort', newSort)
    const qs = params.toString()
    router.push(qs ? `/forum?${qs}` : '/forum')
  }

  return (
    <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1">
      <button
        type="button"
        onClick={() => navigate('recentes')}
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
          sort === 'recentes'
            ? 'bg-white text-zinc-900 shadow-sm'
            : 'text-zinc-500 hover:text-zinc-700'
        }`}
      >
        Mais recentes
      </button>
      <button
        type="button"
        onClick={() => navigate('votados')}
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
          sort === 'votados'
            ? 'bg-white text-zinc-900 shadow-sm'
            : 'text-zinc-500 hover:text-zinc-700'
        }`}
      >
        Mais votados
      </button>
    </div>
  )
}
