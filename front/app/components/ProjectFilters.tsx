'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Select from '@/app/components/Select'

type Props = {
  tags: string[]
  semesters: number[]
  students: { id: string; name: string }[]
  categories: { value: string; label: string }[]
}

export default function ProjectFilters({ tags, semesters, students, categories }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [search, setSearch] = useState(searchParams.get('q') ?? '')

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(params.toString() ? `${pathname}?${params}` : pathname)
  }

  function updateTags(values: string[]) {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('tag')
    values.forEach((v) => params.append('tag', v))
    router.push(params.toString() ? `${pathname}?${params}` : pathname)
  }

  function handleSearch(value: string) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => update('q', value), 300)
  }

  function clearAll() {
    setSearch('')
    router.push(pathname)
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  useEffect(() => {
    function close(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const selectedTags = searchParams.getAll('tag')
  const activeFilterCount = [
    selectedTags.length > 0,
    searchParams.has('semester'),
    searchParams.has('aluno'),
    searchParams.has('category'),
  ].filter(Boolean).length

  const hasAny = activeFilterCount > 0 || !!searchParams.get('q')

  return (
    <div className="mb-6 flex flex-col gap-3">
      {/* search + filter button row */}
      <div ref={panelRef} className="relative flex gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <circle cx={11} cy={11} r={8}/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar pelo nome..."
            className="w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-4 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition placeholder:text-zinc-400"
          />
          {search && (
            <button type="button" onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700">
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${
              activeFilterCount > 0
                ? 'border-[#2F9E41] bg-green-50 text-[#2F9E41]'
                : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <line x1={4} y1={6} x2={20} y2={6}/><line x1={8} y1={12} x2={16} y2={12}/><line x1={11} y1={18} x2={13} y2={18}/>
            </svg>
            Filtros
            {activeFilterCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: '#2F9E41' }}>
                {activeFilterCount}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute left-0 right-0 top-full z-30 mt-1 sm:left-auto sm:right-0 sm:w-72 rounded-xl border border-zinc-200 bg-white shadow-lg p-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-zinc-500">Categoria</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => update('category', '')}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${!searchParams.get('category') ? 'text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
                    style={!searchParams.get('category') ? { backgroundColor: '#2F9E41' } : undefined}
                  >
                    Todas
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => update('category', searchParams.get('category') === cat.value ? '' : cat.value)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${searchParams.get('category') === cat.value ? 'text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
                      style={searchParams.get('category') === cat.value ? { backgroundColor: '#2F9E41' } : undefined}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-zinc-500">Tecnologias</p>
                <MultiSelect
                  values={selectedTags}
                  onChange={updateTags}
                  placeholder="Todas"
                  options={tags.map((t) => ({ value: t, label: t }))}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-zinc-500">Semestre</p>
                <Select
                  value={searchParams.get('semester') ?? ''}
                  onChange={(v) => update('semester', v)}
                  placeholder="Todos"
                  options={semesters.map((s) => ({ value: String(s), label: `${s}º semestre` }))}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-zinc-500">Aluno</p>
                <SearchableSelect
                  value={searchParams.get('aluno') ?? ''}
                  onChange={(v) => update('aluno', v)}
                  placeholder="Todos"
                  options={students.map((s) => ({ value: s.id, label: s.name }))}
                />
              </div>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => { clearAll(); setOpen(false) }}
                  className="w-full rounded-lg border border-zinc-200 py-2 text-xs font-medium text-zinc-500 hover:bg-zinc-50 transition"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          )}
        </div>

        {hasAny && (
          <button type="button" onClick={clearAll} className="text-sm text-zinc-400 hover:text-zinc-700 transition whitespace-nowrap">
            Limpar ×
          </button>
        )}
      </div>
    </div>
  )
}

function SearchableSelect({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const selected = options.find((o) => o.value === value)
  const filtered = options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch('') }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 0); else setSearch('') }, [open])

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white pl-3 pr-2.5 py-2 text-sm text-left outline-none focus:border-zinc-400 transition"
      >
        <span className={selected ? 'text-zinc-700 truncate' : 'text-zinc-400'}>{selected ? selected.label : placeholder}</span>
        <svg className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-zinc-200 bg-white shadow-lg overflow-hidden">
          <div className="p-2 border-b border-zinc-100">
            <input ref={inputRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar..." className="w-full rounded-lg bg-zinc-50 px-3 py-1.5 text-sm outline-none placeholder:text-zinc-400" />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            <button type="button" onClick={() => { onChange(''); setOpen(false) }} className={`w-full text-left px-3 py-2 text-sm transition-colors ${!value ? 'font-medium text-zinc-900 bg-zinc-50' : 'text-zinc-400 hover:bg-zinc-50'}`}>{placeholder}</button>
            {filtered.length === 0
              ? <p className="px-3 py-3 text-sm text-zinc-400 text-center">Nenhum resultado</p>
              : filtered.map((o) => (
                <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); setSearch('') }} className={`w-full text-left px-3 py-2 text-sm transition-colors ${o.value === value ? 'font-medium text-zinc-900 bg-zinc-50' : 'text-zinc-700 hover:bg-zinc-50'}`}>{o.label}</button>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}

type MultiSelectOption = { value: string; label: string }

function MultiSelect({ values, onChange, options, placeholder }: {
  values: string[]; onChange: (v: string[]) => void; options: MultiSelectOption[]; placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const selected = options.filter((o) => values.includes(o.value))
  const filtered = options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch('') }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 0); else setSearch('') }, [open])

  function toggle(value: string) {
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value])
  }

  const label = selected.length === 0 ? placeholder : selected.length === 1 ? selected[0].label : `${selected.length} tecnologias`

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white pl-3 pr-2.5 py-2 text-sm text-left outline-none focus:border-zinc-400 transition"
      >
        <span className={selected.length > 0 ? 'text-zinc-700 truncate' : 'text-zinc-400'}>{label}</span>
        <svg className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-zinc-200 bg-white shadow-lg overflow-hidden">
          <div className="p-2 border-b border-zinc-100">
            <input ref={inputRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar tecnologia..." className="w-full rounded-lg bg-zinc-50 px-3 py-1.5 text-sm outline-none placeholder:text-zinc-400" />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {!search && (
              <button type="button" onClick={() => onChange([])} className={`w-full text-left px-3 py-2 text-sm transition-colors ${selected.length === 0 ? 'font-medium text-zinc-900 bg-zinc-50' : 'text-zinc-400 hover:bg-zinc-50'}`}>{placeholder}</button>
            )}
            {filtered.length === 0
              ? <p className="px-3 py-3 text-sm text-zinc-400 text-center">Nenhum resultado</p>
              : filtered.map((o) => {
                const active = values.includes(o.value)
                return (
                  <button key={o.value} type="button" onClick={() => toggle(o.value)} className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${active ? 'font-medium text-zinc-900 bg-zinc-50' : 'text-zinc-700 hover:bg-zinc-50'}`}>
                    <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${active ? 'border-[#2F9E41] bg-[#2F9E41]' : 'border-zinc-300 bg-white'}`}>
                      {active && <svg className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd"/></svg>}
                    </span>
                    {o.label}
                  </button>
                )
              })
            }
          </div>
        </div>
      )}
    </div>
  )
}
