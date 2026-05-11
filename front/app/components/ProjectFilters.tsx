'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Select from '@/app/components/Select'

type Props = {
  tags: string[]
  semesters: number[]
  students: { id: string; name: string }[]
}

export default function ProjectFilters({ tags, semesters, students }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  function updateTags(values: string[]) {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('tag')
    values.forEach((value) => params.append('tag', value))
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  const selectedTags = searchParams.getAll('tag')
  const hasFilters =
    searchParams.has('tag') || searchParams.has('semester') || searchParams.has('aluno')

  return (
    <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <MultiSelect
        values={selectedTags}
        onChange={updateTags}
        placeholder="Todas as tecnologias"
        options={tags.map((t) => ({ value: t, label: t }))}
        className="w-full sm:w-56"
      />
      <Select
        value={searchParams.get('semester') ?? ''}
        onChange={(v) => update('semester', v)}
        placeholder="Todos os semestres"
        options={semesters.map((s) => ({ value: String(s), label: `${s}º semestre` }))}
        className="w-full sm:w-52"
      />
      <SearchableSelect
        value={searchParams.get('aluno') ?? ''}
        onChange={(v) => update('aluno', v)}
        placeholder="Todos os alunos"
        options={students.map((s) => ({ value: s.id, label: s.name }))}
        className="w-full sm:w-48"
      />
      {hasFilters && (
        <button
          onClick={() => router.push(pathname)}
          className="text-sm text-zinc-400 hover:text-zinc-700 transition px-1 text-left"
        >
          Limpar ×
        </button>
      )}
    </div>
  )
}

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.value === value)
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0)
    else setSearch('')
  }, [open])

  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white pl-3 pr-2.5 py-2 text-sm text-left outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition"
      >
        <span className={selected ? 'text-zinc-700 truncate' : 'text-zinc-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
        >
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full min-w-[200px] rounded-xl border border-zinc-200 bg-white shadow-lg overflow-hidden">
          <div className="p-2 border-b border-zinc-100">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar aluno..."
                className="w-full rounded-lg bg-zinc-50 pl-7 pr-3 py-1.5 text-sm text-zinc-700 outline-none placeholder:text-zinc-400"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                !value ? 'text-zinc-900 font-medium bg-zinc-50' : 'text-zinc-400 hover:bg-zinc-50'
              }`}
            >
              {placeholder}
            </button>
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-sm text-zinc-400 text-center">Nenhum resultado</p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false); setSearch('') }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    o.value === value ? 'text-zinc-900 font-medium bg-zinc-50' : 'text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

type MultiSelectOption = { value: string; label: string }

function MultiSelect({
  values,
  onChange,
  options,
  placeholder,
  className,
}: {
  values: string[]
  onChange: (values: string[]) => void
  options: MultiSelectOption[]
  placeholder: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.filter((option) => values.includes(option.value))

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function toggle(value: string) {
    onChange(
      values.includes(value)
        ? values.filter((current) => current !== value)
        : [...values, value]
    )
  }

  const label =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? selected[0].label
        : `${selected.length} tecnologias`

  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white pl-3 pr-2.5 py-2 text-sm text-left outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition"
      >
        <span className={selected.length > 0 ? 'text-zinc-700 truncate' : 'text-zinc-400'}>
          {label}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full min-w-max rounded-xl border border-zinc-200 bg-white shadow-lg py-1 max-h-64 overflow-y-auto">
          <button
            type="button"
            onClick={() => onChange([])}
            className={`w-full text-left px-3 py-2 text-sm transition-colors ${
              selected.length === 0
                ? 'text-zinc-900 font-medium bg-zinc-50'
                : 'text-zinc-400 hover:bg-zinc-50'
            }`}
          >
            {placeholder}
          </button>
          {options.map((option) => {
            const active = values.includes(option.value)
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggle(option.value)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                  active ? 'text-zinc-900 font-medium bg-zinc-50' : 'text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                <span
                  className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${
                    active ? 'border-[#2F9E41] bg-[#2F9E41]' : 'border-zinc-300 bg-white'
                  }`}
                >
                  {active && (
                    <svg className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                    </svg>
                  )}
                </span>
                {option.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
