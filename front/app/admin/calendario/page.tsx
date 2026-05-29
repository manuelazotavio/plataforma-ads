'use client'

import { useEffect, useMemo, useState } from 'react'
import Select from '@/app/components/Select'
import { LoadingState } from '@/app/components/LoadingScreen'
import { supabase } from '@/app/lib/supabase'
import {
  CALENDAR_COLOR_OPTIONS,
  CANCEL_SCHOOL_DAY_COLORS,
  calendarItemDot,
  calendarItemExcelBg,
  type CalendarItem,
} from '@/app/lib/calendarItems'

type FormState = {
  title: string
  description: string
  start_date: string
  end_date: string
  color: string
  url: string
  is_active: boolean
  visible_to_students: boolean
  show_in_grid: boolean
  adds_school_day: boolean
}

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  start_date: '',
  end_date: '',
  color: 'zinc',
  url: '',
  is_active: true,
  visible_to_students: true,
  show_in_grid: true,
  adds_school_day: false,
}

const colorOptions = CALENDAR_COLOR_OPTIONS.map((c) => ({ value: c.value, label: c.label }))

const MONTH_NAMES_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const DAYS_OF_WEEK_PT = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO']

function parseLocalDate(str: string) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDayMonth(date: Date) {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`
}

function itemsOnDate(activeItems: CalendarItem[], date: Date, gridOnly: boolean) {
  return activeItems.filter((it) => {
    if (gridOnly && !it.show_in_grid) return false
    const start = parseLocalDate(it.start_date)
    const end = it.end_date ? parseLocalDate(it.end_date) : new Date(start)
    return date >= start && date <= end
  })
}

function isSchoolDay(activeItems: CalendarItem[], date: Date): boolean {
  const overlapping = itemsOnDate(activeItems, date, false)
  if (overlapping.some((it) => it.adds_school_day)) return true
  if (overlapping.some((it) => it.show_in_grid && CANCEL_SCHOOL_DAY_COLORS.has(it.color))) return false
  const dow = date.getDay()
  return dow !== 0 && dow !== 6
}

// [semestre 0|1][diaSemana 0-6] → total dias letivos
function computeSchoolDayCounts(activeItems: CalendarItem[], year: number): number[][] {
  const counts = Array.from({ length: 2 }, () => Array(7).fill(0) as number[])
  const totalDays = new Date(year, 11, 31).getTime()
  let d = new Date(year, 0, 1)
  while (d.getTime() <= totalDays) {
    if (isSchoolDay(activeItems, d)) {
      const sem = d.getMonth() < 6 ? 0 : 1
      counts[sem][d.getDay()] += 1
    }
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
  }
  return counts
}

type EventEntry = {
  id: string
  title: string
  start_date: string | null
  end_date: string | null
  category: string | null
  is_active: boolean
}

export default function AdminCalendarioPage() {
  const [items, setItems] = useState<CalendarItem[]>([])
  const [events, setEvents] = useState<EventEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [exportYear, setExportYearState] = useState(new Date().getFullYear())
  const [exporting, setExporting] = useState(false)

  async function load() {
    setLoading(true)
    const [{ data: itemsData, error: loadError }, { data: eventsData }] = await Promise.all([
      supabase
        .from('calendar_items')
        .select('id, title, description, start_date, end_date, color, url, is_active, visible_to_students, show_in_grid, adds_school_day')
        .order('start_date', { ascending: true }),
      supabase
        .from('events')
        .select('id, title, start_date, end_date, category, is_active')
        .order('start_date', { ascending: true }),
    ])
    if (loadError) setError(loadError.message)
    else setItems((itemsData ?? []) as CalendarItem[])
    setEvents((eventsData ?? []) as EventEntry[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const upcoming = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10)
    return items.filter((it) => (it.end_date ?? it.start_date) >= todayStr)
  }, [items])

  const past = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10)
    return items.filter((it) => (it.end_date ?? it.start_date) < todayStr)
  }, [items])

  const schoolDayCounts = useMemo(() => {
    const activeItems = items.filter((it) => it.is_active)
    return computeSchoolDayCounts(activeItems, exportYear)
  }, [items, exportYear])

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
    setError(null)
    setNotice(null)
  }

  function openEdit(item: CalendarItem) {
    setEditingId(item.id)
    setForm({
      title: item.title,
      description: item.description ?? '',
      start_date: item.start_date,
      end_date: item.end_date ?? '',
      color: item.color ?? 'zinc',
      url: item.url ?? '',
      is_active: item.is_active,
      visible_to_students: item.visible_to_students,
      show_in_grid: item.show_in_grid,
      adds_school_day: item.adds_school_day,
    })
    setShowForm(true)
    setError(null)
    setNotice(null)
  }

  function cancel() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  async function save(formEvent: React.FormEvent) {
    formEvent.preventDefault()
    if (!form.title.trim() || !form.start_date) {
      setError('Título e data de início são obrigatórios.')
      return
    }
    if (form.end_date && form.end_date < form.start_date) {
      setError('A data de fim não pode ser anterior à data de início.')
      return
    }
    setSaving(true)
    setError(null)
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      start_date: form.start_date,
      end_date: form.end_date || null,
      color: form.color,
      url: form.url.trim() || null,
      is_active: form.is_active,
      visible_to_students: form.visible_to_students,
      show_in_grid: form.show_in_grid,
      adds_school_day: form.adds_school_day,
    }
    const { error: saveError } = editingId
      ? await supabase.from('calendar_items').update(payload).eq('id', editingId)
      : await supabase.from('calendar_items').insert(payload)
    if (saveError) {
      setError(saveError.message)
      setSaving(false)
      return
    }
    setNotice(editingId ? 'Item atualizado.' : 'Item criado.')
    cancel()
    await load()
    setSaving(false)
  }

  async function toggleActive(item: CalendarItem) {
    setSaving(true)
    await supabase.from('calendar_items').update({ is_active: !item.is_active }).eq('id', item.id)
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, is_active: !item.is_active } : it)))
    setSaving(false)
  }

  async function remove(item: CalendarItem) {
    if (!confirm(`Excluir "${item.title}"?`)) return
    setSaving(true)
    await supabase.from('calendar_items').delete().eq('id', item.id)
    setItems((prev) => prev.filter((it) => it.id !== item.id))
    setSaving(false)
  }

  async function exportExcel(year: number) {
    setExporting(true)
    setError(null)
    setNotice(null)
    try {
      const ExcelJSModule = await import('exceljs')
      const ExcelJS = ExcelJSModule.default ?? ExcelJSModule
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'Plataforma ADS'
      workbook.created = new Date()

      const thinBorder = { style: 'thin' as const, color: { argb: 'FF000000' } }

      const activeItems = items.filter((it) => it.is_active)

      // Logo IFSP + ADS embutida no cabeçalho. Carregada uma vez e reutilizada nas 12 abas.
      let headerLogoId: number | undefined
      try {
        const res = await fetch('/calendario-cabecalho-ifsp-ads.jpeg')
        if (res.ok) {
          const buf = await res.arrayBuffer()
          headerLogoId = workbook.addImage({ buffer: buf, extension: 'jpeg' })
        }
      } catch {
        // Sem logo: cabeçalho fica em branco do lado direito.
      }

      const onDate = (date: Date, gridOnly: boolean) => itemsOnDate(activeItems, date, gridOnly)
      const schoolDay = (date: Date) => isSchoolDay(activeItems, date)

      for (let m = 0; m < 12; m++) {
        const ws = workbook.addWorksheet(MONTH_NAMES_PT[m])
        // 14 colunas: cada dia da semana ocupa 2 colunas (esquerda = nº do dia, direita = contador letivo)
        ws.columns = Array.from({ length: 14 }, () => ({ width: 11 }))

        // Linha 1 — barra de título
        ws.mergeCells('A1:F1')
        const titleCell = ws.getCell('A1')
        titleCell.value = `${year}   ${MONTH_NAMES_PT[m].toLowerCase()}`
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F9E41' } }
        titleCell.font = { name: 'Calibri', size: 22, bold: true, color: { argb: 'FFFFFFFF' } }
        titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

        ws.mergeCells('G1:N1')
        const brandCell = ws.getCell('G1')
        brandCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
        ws.getRow(1).height = 48

        if (headerLogoId !== undefined) {
          // Imagem flutuante cobrindo o range G1:N1 (col 6..N=13 0-indexed).
          // Proporção da arte ~8:1 → 500×62 cabe na linha (h=48pt ≈ 64px) com leve folga.
          ws.addImage(headerLogoId, {
            tl: { col: 6.05, row: 0.05 },
            ext: { width: 500, height: 60 },
          })
        }

        // Linha 2 — cabeçalho dos dias da semana (cada um ocupa 2 colunas)
        DAYS_OF_WEEK_PT.forEach((day, i) => {
          const leftCol = 1 + i * 2
          const rightCol = 2 + i * 2
          ws.mergeCells(2, leftCol, 2, rightCol)
          const cell = ws.getCell(2, leftCol)
          cell.value = day
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } }
          cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
          cell.alignment = { vertical: 'middle', horizontal: 'center' }
          cell.border = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder }
        })
        ws.getRow(2).height = 22

        // Grade — calcula células
        const firstWeekday = new Date(year, m, 1).getDay()
        const daysInMonth = new Date(year, m + 1, 0).getDate()
        const cellsArr: (number | null)[] = [
          ...Array(firstWeekday).fill(null),
          ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
        ]
        while (cellsArr.length % 7 !== 0) cellsArr.push(null)
        const weekCount = cellsArr.length / 7

        // Contador progressivo por coluna (0=dom..6=sab). Incrementa em cada dia letivo encontrado em ordem.
        const counters = [0, 0, 0, 0, 0, 0, 0]

        for (let r = 0; r < weekCount; r++) {
          const topRow = 3 + r * 2
          const botRow = 4 + r * 2
          ws.getRow(topRow).height = 18
          ws.getRow(botRow).height = 58

          for (let c = 0; c < 7; c++) {
            const day = cellsArr[r * 7 + c]
            const leftCol = 1 + c * 2
            const rightCol = 2 + c * 2

            // Mescla a linha de baixo para o título
            ws.mergeCells(botRow, leftCol, botRow, rightCol)
            const titleCell2 = ws.getCell(botRow, leftCol)
            const topLeft = ws.getCell(topRow, leftCol)
            const topRight = ws.getCell(topRow, rightCol)

            if (day === null) {
              const fillEmpty = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFD9D9D9' } }
              topLeft.fill = fillEmpty
              topRight.fill = fillEmpty
              titleCell2.fill = fillEmpty
              topLeft.border = { top: thinBorder, left: thinBorder }
              topRight.border = { top: thinBorder, right: thinBorder }
              titleCell2.border = { bottom: thinBorder, left: thinBorder, right: thinBorder }
              continue
            }

            const dayDate = new Date(year, m, day)
            const dayItems = onDate(dayDate, true)
            const annotationDayItems = onDate(dayDate, false).filter((it) => !it.show_in_grid)
            const letivo = schoolDay(dayDate)
            if (letivo) counters[c] += 1

            const isWeekend = c === 0 || c === 6
            let bgArgb = isWeekend ? 'FFD9D9D9' : 'FFFFFFFF'
            let textArgb = 'FF000000'

            if (dayItems.length > 0) {
              const colorInfo = calendarItemExcelBg(dayItems[0].color)
              bgArgb = colorInfo.bg
              textArgb = colorInfo.fg
            }

            const fill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: bgArgb } }

            // Canto superior esquerdo: número do dia
            topLeft.value = String(day).padStart(2, '0')
            topLeft.font = { name: 'Calibri', bold: true, size: 11, color: { argb: textArgb } }
            topLeft.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
            topLeft.fill = fill
            topLeft.border = { top: thinBorder, left: thinBorder }

            // Canto superior direito: contador letivo (se aplicável)
            if (letivo) {
              topRight.value = counters[c]
              topRight.font = { name: 'Calibri', bold: true, size: 11, color: { argb: textArgb } }
            }
            topRight.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 }
            topRight.fill = fill
            topRight.border = { top: thinBorder, right: thinBorder }

            // Linha de baixo: itens da grade + anotações do dia (show_in_grid=false)
            if (dayItems.length > 0 || annotationDayItems.length > 0) {
              const richText: { text: string; font: Record<string, unknown> }[] = []
              dayItems.forEach((it, i) => {
                richText.push({ text: (i > 0 ? '\n' : '') + it.title, font: { name: 'Calibri', size: 10, color: { argb: textArgb } } })
              })
              annotationDayItems.forEach((it) => {
                richText.push({ text: (richText.length > 0 ? '\n' : '') + it.title, font: { name: 'Calibri', size: 9, italic: true, color: { argb: textArgb } } })
              })
              titleCell2.value = { richText }
            }
            titleCell2.alignment = { wrapText: true, vertical: 'top', horizontal: 'center' }
            titleCell2.fill = fill
            titleCell2.border = { bottom: thinBorder, left: thinBorder, right: thinBorder }
          }
        }

        // Anotações: items com show_in_grid=false que se sobrepõem ao mês
        const gridEndRow = 2 + weekCount * 2
        const monthStart = new Date(year, m, 1)
        const monthEnd = new Date(year, m + 1, 0)
        const annotationItems = activeItems.filter((it) => {
          if (it.show_in_grid) return false
          const start = parseLocalDate(it.start_date)
          const end = it.end_date ? parseLocalDate(it.end_date) : new Date(start)
          return end >= monthStart && start <= monthEnd
        })

        if (annotationItems.length > 0) {
          const headerRow = gridEndRow + 1
          ws.mergeCells(headerRow, 1, headerRow, 14)
          const header = ws.getCell(headerRow, 1)
          header.value = 'Anotações:'
          header.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FF000000' } }
          header.alignment = { vertical: 'middle', horizontal: 'left' }
          ws.getRow(headerRow).height = 20

          annotationItems.forEach((it, i) => {
            const rIdx = headerRow + 1 + i
            ws.mergeCells(rIdx, 1, rIdx, 14)
            const noteCell = ws.getCell(rIdx, 1)
            const start = parseLocalDate(it.start_date)
            const end = it.end_date ? parseLocalDate(it.end_date) : start
            const range = it.end_date && it.start_date !== it.end_date
              ? `${formatDayMonth(start)} a ${formatDayMonth(end)}`
              : formatDayMonth(start)
            noteCell.value = `${range} - ${it.title}`
            noteCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF000000' } }
            noteCell.alignment = { vertical: 'middle', horizontal: 'left' }
            ws.getRow(rIdx).height = 16
          })
        }

        ws.pageSetup = {
          orientation: 'landscape',
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 1,
          paperSize: 9,
          margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
        }
      }

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer as ArrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Calendario_ADS_${year}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setNotice(`Calendário ${year} exportado.`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar Excel.'
      setError(message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Calendário</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Datas acadêmicas e prazos (rematrícula, feriados, entregas). Não são eventos.
          </p>
        </div>
        {!showForm && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-500">
              Ano
              <input
                type="number"
                value={exportYear}
                onChange={(e) => setExportYearState(Number(e.target.value) || new Date().getFullYear())}
                min={2000}
                max={2100}
                className="w-20 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              />
            </label>
            <button
              type="button"
              onClick={() => void exportExcel(exportYear)}
              disabled={exporting || items.length === 0}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1={12} y1={15} x2={12} y2={3} />
              </svg>
              {exporting ? 'Gerando…' : 'Exportar Excel'}
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="cursor-pointer rounded-lg bg-[#2F9E41] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              + Nova data
            </button>
          </div>
        )}
      </div>

      {notice && (
        <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</p>
      )}
      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <SchoolDayCard counts={schoolDayCounts} year={exportYear} />

      {showForm && (
        <form onSubmit={save} className="mb-6 grid gap-4 rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-zinc-900">{editingId ? 'Editar data' : 'Nova data'}</h2>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
            Título
            <input
              autoFocus
              type="text"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Ex: Rematrícula"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
            Descrição <span className="font-normal text-zinc-400">(opcional)</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              placeholder="Detalhes que aparecem ao abrir o item"
              className="resize-y rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
              Data de início
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
              Data de fim <span className="font-normal text-zinc-400">(opcional)</span>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              />
            </label>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[160px_1fr]">
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
              Cor
              <Select
                value={form.color}
                onChange={(v) => setForm((p) => ({ ...p, color: v }))}
                options={colorOptions}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
              Link externo <span className="font-normal text-zinc-400">(opcional)</span>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                placeholder="https://suap.ifsp.edu.br/..."
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              />
            </label>
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
              />
              Ativo no calendário
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.visible_to_students}
                onChange={(e) => setForm((p) => ({ ...p, visible_to_students: e.target.checked }))}
              />
              Visível para alunos
              <span className="text-xs font-normal text-zinc-400">(quando desmarcado, só professores e admins veem)</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.show_in_grid}
                onChange={(e) => setForm((p) => ({ ...p, show_in_grid: e.target.checked }))}
              />
              Exibir como bloco no Excel
              <span className="text-xs font-normal text-zinc-400">(quando desmarcado, vai pra seção &quot;Anotações:&quot; do rodapé)</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.adds_school_day}
                onChange={(e) => setForm((p) => ({ ...p, adds_school_day: e.target.checked }))}
              />
              Reposição: contar como dia letivo
              <span className="text-xs font-normal text-zinc-400">(força sábado/domingo ou data cancelada a entrar no totalizador)</span>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={cancel}
              className="cursor-pointer rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !form.title.trim() || !form.start_date}
              className="cursor-pointer rounded-lg bg-[#2F9E41] px-5 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Salvando…' : editingId ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <LoadingState message="Carregando calendário" />
      ) : (
        <div className="flex flex-col gap-8">
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-12 text-center">
              <p className="text-sm text-zinc-400">Nenhuma data cadastrada ainda.</p>
            </div>
          ) : (
            <>
              {upcoming.length > 0 && (
                <CalendarItemSection title="Próximas" items={upcoming} onEdit={openEdit} onToggle={toggleActive} onDelete={remove} saving={saving} />
              )}
              {past.length > 0 && (
                <CalendarItemSection title="Anteriores" items={past} onEdit={openEdit} onToggle={toggleActive} onDelete={remove} saving={saving} dim />
              )}
            </>
          )}

          {events.length > 0 && (
            <section>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Eventos cadastrados</p>
              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                {events.map((ev, i) => {
                  const todayStr = new Date().toISOString().slice(0, 10)
                  const endStr = ev.end_date ?? ev.start_date ?? ''
                  const isPast = endStr < todayStr
                  return (
                    <div
                      key={ev.id}
                      className={`flex items-center gap-3 px-4 py-3 ${i !== events.length - 1 ? 'border-b border-zinc-100' : ''} ${isPast ? 'opacity-40' : ''} ${!ev.is_active ? 'opacity-30' : ''}`}
                    >
                      <span className="h-3 w-3 shrink-0 rounded-full bg-[#2F9E41]" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-900">{ev.title}</p>
                        <p className="text-xs text-zinc-400">
                          {formatRange(ev.start_date ?? '', ev.end_date)}
                          {ev.category && <span className="ml-2 text-zinc-300">· {ev.category}</span>}
                        </p>
                      </div>
                      {!ev.is_active && (
                        <span className="shrink-0 rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] font-semibold text-zinc-400">
                          Inativo
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

// seg=1, ter=2, qua=3, qui=4, sex=5 — omite dom e sáb se zero em ambos semestres
const DOW_LABELS: Record<number, string> = { 0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb' }

function SchoolDayCard({ counts, year }: { counts: number[][]; year: number }) {
  // Determina quais dias da semana aparecem (remove dom/sáb se ambos semestres = 0)
  const visibleDows = [0, 1, 2, 3, 4, 5, 6].filter(
    (dow) => counts[0][dow] > 0 || counts[1][dow] > 0
  )

  const semTotals = [0, 1].map((s) => visibleDows.reduce((acc, dow) => acc + counts[s][dow], 0))
  const dowTotals = visibleDows.map((dow) => counts[0][dow] + counts[1][dow])
  const grandTotal = semTotals[0] + semTotals[1]

  if (grandTotal === 0) return null

  return (
    <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Dias letivos — {year}
        </p>
        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600">
          {grandTotal} total
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="pb-2 pr-4 text-left text-xs font-semibold text-zinc-400 w-28" />
              {visibleDows.map((dow) => (
                <th key={dow} className="pb-2 px-2 text-center text-xs font-semibold text-zinc-500">
                  {DOW_LABELS[dow]}
                </th>
              ))}
              <th className="pb-2 pl-3 text-center text-xs font-semibold text-zinc-400 border-l border-zinc-100">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {[0, 1].map((s) => (
              <tr key={s} className="border-t border-zinc-100">
                <td className="py-2 pr-4 text-xs font-semibold text-zinc-500">
                  {s === 0 ? '1º Semestre' : '2º Semestre'}
                </td>
                {visibleDows.map((dow) => (
                  <td key={dow} className="py-2 px-2 text-center">
                    {counts[s][dow] > 0 ? (
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#2F9E41]/10 text-xs font-bold text-[#2F9E41]">
                        {counts[s][dow]}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-200">—</span>
                    )}
                  </td>
                ))}
                <td className="py-2 pl-3 text-center border-l border-zinc-100">
                  <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-zinc-100 px-2 text-xs font-bold text-zinc-700">
                    {semTotals[s]}
                  </span>
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-zinc-200">
              <td className="pt-2 pr-4 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Total</td>
              {visibleDows.map((dow, i) => (
                <td key={dow} className="pt-2 px-2 text-center">
                  <span className="text-xs font-semibold text-zinc-500">{dowTotals[i]}</span>
                </td>
              ))}
              <td className="pt-2 pl-3 text-center border-l border-zinc-100">
                <span className="text-xs font-bold text-zinc-700">{grandTotal}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CalendarItemSection({ title, items, onEdit, onToggle, onDelete, saving, dim }: {
  title: string
  items: CalendarItem[]
  onEdit: (it: CalendarItem) => void
  onToggle: (it: CalendarItem) => void
  onDelete: (it: CalendarItem) => void
  saving: boolean
  dim?: boolean
}) {
  return (
    <section>
      <p className={`mb-3 text-xs font-semibold uppercase tracking-wide ${dim ? 'text-zinc-300' : 'text-zinc-400'}`}>{title}</p>
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        {items.map((item, i) => (
          <div
            key={item.id}
            className={`flex items-center gap-3 px-4 py-3 ${i !== items.length - 1 ? 'border-b border-zinc-100' : ''} ${
              !item.is_active ? 'opacity-50' : ''
            }`}
          >
            <span className={`h-3 w-3 shrink-0 rounded-full ${calendarItemDot(item.color)}`} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium text-zinc-900">{item.title}</p>
                {!item.visible_to_students && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                      <line x1={1} y1={1} x2={23} y2={23} />
                    </svg>
                    Oculto p/ alunos
                  </span>
                )}
                {!item.show_in_grid && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                    <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1={9} y1={13} x2={15} y2={13} />
                      <line x1={9} y1={17} x2={15} y2={17} />
                    </svg>
                    Anotações no Excel
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">
                {formatRange(item.start_date, item.end_date)}
                {item.url && <span className="ml-2 text-zinc-300">· {item.url}</span>}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => onToggle(item)}
                disabled={saving}
                className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition disabled:opacity-50 ${
                  item.is_active ? 'border-green-200 text-green-700 hover:bg-green-50' : 'border-zinc-200 text-zinc-400 hover:bg-zinc-50'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${item.is_active ? 'bg-green-500' : 'bg-zinc-300'}`} />
                {item.is_active ? 'Ativa' : 'Oculta'}
              </button>
              <button
                type="button"
                onClick={() => onEdit(item)}
                disabled={saving}
                className="cursor-pointer rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => onDelete(item)}
                disabled={saving}
                className="cursor-pointer rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function formatRange(start: string, end: string | null) {
  const fmt = (s: string) => {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  if (!end || end === start) return fmt(start)
  return `${fmt(start)} — ${fmt(end)}`
}
