'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

const SORT_OPTIONS = [
  { value: 'xp',      label: 'Mais XP' },
  { value: 'antigos', label: 'Mais antigos' },
]

const ROLE_OPTIONS = [
  { value: '',          label: 'Todos' },
  { value: 'aluno',     label: 'Alunos' },
  { value: 'professor', label: 'Professores' },
  { value: 'egresso',   label: 'Ex-alunos' },
]

export default function RankingFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const sort = searchParams.get('sort') ?? 'xp'
  const role = searchParams.get('role') ?? ''

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-2 mb-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
      <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1 w-full sm:w-auto">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => update('sort', opt.value === 'xp' ? '' : opt.value)}
            className={`flex-1 sm:flex-none rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              sort === opt.value
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1 w-full sm:w-auto">
        {ROLE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => update('role', opt.value)}
            className={`flex-1 sm:flex-none rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              role === opt.value
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
