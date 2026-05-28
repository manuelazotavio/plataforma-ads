'use client'

import { useRouter } from 'next/navigation'
import Select from '@/app/components/Select'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os eventos' },
  { value: 'proximos', label: 'Próximos' },
  { value: 'abertas', label: 'Inscrições abertas' },
  { value: 'anteriores', label: 'Anteriores' },
]

type Props = {
  value: string
  categoria?: string
  q?: string
}

export default function EventStatusSelect({ value, categoria, q }: Props) {
  const router = useRouter()

  function onChange(next: string) {
    const params = new URLSearchParams()
    if (categoria) params.set('categoria', categoria)
    if (next) params.set('status', next)
    if (q) params.set('q', q)
    const qs = params.toString()
    router.push(qs ? `/eventos?${qs}` : '/eventos')
  }

  return (
    <div className="w-full sm:w-72">
      <Select value={value} onChange={onChange} options={STATUS_OPTIONS} />
    </div>
  )
}
