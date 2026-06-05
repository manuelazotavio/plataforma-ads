'use client'

import { useRouter } from 'next/navigation'
import Select from '@/app/components/Select'

type CategoryOption = {
  id: string
  name: string
}

type Props = {
  value?: string
  sort?: string
  q?: string
  author?: string
  categories: CategoryOption[]
}

export default function ForumCategorySelect({ value, sort, q, author, categories }: Props) {
  const router = useRouter()

  function onChange(next: string) {
    const params = new URLSearchParams()
    if (next) params.set('category', next)
    if (sort && sort !== 'recentes') params.set('sort', sort)
    if (q?.trim()) params.set('q', q.trim())
    if (author?.trim()) params.set('author', author.trim())
    const qs = params.toString()
    router.push(qs ? `/forum?${qs}` : '/forum')
  }

  return (
    <div className="w-full sm:w-72">
      <Select
        value={value ?? ''}
        onChange={onChange}
        options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
        placeholder="Todas as categorias"
      />
    </div>
  )
}
