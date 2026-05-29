'use client'

import { useRouter } from 'next/navigation'
import Select from '@/app/components/Select'

type CategoryOption = {
  id: string
  name: string
}

type Props = {
  value?: string
  categories: CategoryOption[]
}

export default function ForumCategorySelect({ value, categories }: Props) {
  const router = useRouter()

  function onChange(next: string) {
    router.push(next ? `/forum?category=${next}` : '/forum')
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
