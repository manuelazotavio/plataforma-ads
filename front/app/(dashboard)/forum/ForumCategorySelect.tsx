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
  categories: CategoryOption[]
}

export default function ForumCategorySelect({ value, sort, categories }: Props) {
  const router = useRouter()

  function onChange(next: string) {
    const params = new URLSearchParams()
    if (next) params.set('category', next)
    if (sort && sort !== 'recentes') params.set('sort', sort)
    const qs = params.toString()
    router.push(qs ? `/forum?${qs}` : '/forum')
  }

  return (
    <div className="mb-8 w-full sm:w-80">
      <Select
        value={value ?? ''}
        onChange={onChange}
        options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
        placeholder="Todas as categorias"
      />
    </div>
  )
}
