'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Select from '@/app/components/Select'
import { LoadingState } from '@/app/components/LoadingScreen'
import { supabase } from '@/app/lib/supabase'

type EventRow = {
  id: string
  title: string
  edition: string | null
  category: string | null
  start_date: string | null
}

type Contributor = {
  id: string
  event_id: string
  name: string
  display_order: number
}

export default function AdminEventContributorsPage() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [contributors, setContributors] = useState<Contributor[]>([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function loadEvents() {
      const { data } = await supabase
        .from('events')
        .select('id, title, edition, category, start_date')
        .order('start_date', { ascending: false })

      const rows = (data ?? []) as EventRow[]
      setEvents(rows)
      const eventFromUrl = new URLSearchParams(window.location.search).get('event')
      setSelectedEventId(
        rows.find((event) => event.id === eventFromUrl)?.id
          ?? rows.find((event) => event.category === 'hackathon')?.id
          ?? rows[0]?.id
          ?? ''
      )
      setLoading(false)
    }

    void loadEvents()
  }, [])

  useEffect(() => {
    if (!selectedEventId) {
      setContributors([])
      return
    }
    void loadContributors(selectedEventId)
  }, [selectedEventId])

  const selectedEvent = events.find((event) => event.id === selectedEventId)
  const eventOptions = useMemo(() => events.map((event) => ({
    value: event.id,
    label: [event.title, event.edition].filter(Boolean).join(' - '),
  })), [events])

  async function loadContributors(eventId: string) {
    const { data } = await supabase
      .from('event_contributors')
      .select('id, event_id, name, display_order')
      .eq('event_id', eventId)
      .order('display_order')
      .order('created_at')

    setContributors((data ?? []) as Contributor[])
  }

  async function addContributor() {
    const cleanName = name.trim()
    if (!selectedEventId || !cleanName) return
    setSaving(true)
    await supabase.from('event_contributors').insert({
      event_id: selectedEventId,
      name: cleanName,
      display_order: contributors.length,
    })
    setName('')
    await loadContributors(selectedEventId)
    setSaving(false)
  }

  async function removeContributor(id: string) {
    await supabase.from('event_contributors').delete().eq('id', id)
    setContributors((current) => current.filter((item) => item.id !== id))
  }

  async function importXlsx(file: File) {
    if (!selectedEventId) return
    setImporting(true)
    try {
      const ExcelJSModule = await import('exceljs')
      const ExcelJS = ExcelJSModule.default ?? ExcelJSModule
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(await file.arrayBuffer())
      const worksheet = workbook.worksheets[0]
      if (!worksheet) return

      const names: string[] = []
      worksheet.eachRow((row) => {
        const cells = row.values as unknown[]
        const preferred = String(cells[2] ?? '').trim()
        const fallback = cells
          .slice(1)
          .map((value) => String(value ?? '').trim())
          .find((value) => value && !/^\d+([,.]\d+)?$/.test(value))
        const candidate = preferred && !/^\d+([,.]\d+)?$/.test(preferred) ? preferred : fallback
        if (!candidate) return
        if (/^(total|valor|membros|arrecadado|falta|total final)$/i.test(candidate)) return
        names.push(candidate)
      })

      const uniqueNames = [...new Set(names)]
      if (uniqueNames.length === 0) return

      await supabase.from('event_contributors').insert(uniqueNames.map((contributorName, index) => ({
        event_id: selectedEventId,
        name: contributorName,
        display_order: contributors.length + index,
      })))
      await loadContributors(selectedEventId)
    } finally {
      setImporting(false)
    }
  }

  if (loading) return <LoadingState message="Carregando contribuintes" />

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/admin/eventos" className="mb-2 inline-flex text-sm font-medium text-zinc-400 transition hover:text-zinc-700">
            Eventos
          </Link>
          <h1 className="text-2xl font-semibold text-zinc-900">Contribuintes do hackathon</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Selecione o evento e cadastre os nomes que devem aparecer na página pública.</p>
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={!selectedEventId || importing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
        >
          <IconUpload />
          {importing ? 'Importando...' : 'Importar XLSX'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void importXlsx(file)
          }}
        />
      </div>

      <div className="mb-5 rounded-2xl border border-zinc-200 bg-white p-5">
        <label className="mb-2 block text-xs font-medium text-zinc-500">Evento</label>
        <Select
          value={selectedEventId}
          onChange={setSelectedEventId}
          options={eventOptions}
          placeholder="Selecione um evento"
        />
        {selectedEvent && (
          <p className="mt-2 text-xs text-zinc-400">
            Os contribuintes cadastrados aqui aparecem em: {selectedEvent.title}
          </p>
        )}
      </div>

      <div className="mb-5 rounded-2xl border border-zinc-200 bg-white p-5">
        <label className="mb-2 block text-xs font-medium text-zinc-500">Nome do contribuinte</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void addContributor()
              }
            }}
            className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
            placeholder="Ex: Andre Luis Duarte"
          />
          <button
            type="button"
            onClick={addContributor}
            disabled={!selectedEventId || !name.trim() || saving}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50"
            style={{ backgroundColor: '#2F9E41' }}
          >
            {saving ? 'Salvando...' : 'Adicionar'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-900">
            {contributors.length} contribuinte{contributors.length !== 1 ? 's' : ''}
          </h2>
        </div>
        {contributors.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-zinc-400">
            Nenhum contribuinte cadastrado para este evento.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {contributors.map((contributor) => (
              <div key={contributor.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <p className="min-w-0 truncate text-sm font-medium text-zinc-800">{contributor.name}</p>
                <button
                  type="button"
                  onClick={() => removeContributor(contributor.id)}
                  className="shrink-0 rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function IconUpload() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m17 8-5-5-5 5" />
      <path d="M12 3v12" />
    </svg>
  )
}
