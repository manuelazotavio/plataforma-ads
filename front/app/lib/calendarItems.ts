
export type CalendarItem = {
  id: string
  title: string
  description: string | null
  start_date: string
  end_date: string | null
  color: string
  url: string | null
  is_active: boolean
  visible_to_students: boolean
  show_in_grid: boolean
  adds_school_day: boolean
}

export const CANCEL_SCHOOL_DAY_COLORS = new Set(['rose', 'zinc'])

export const CALENDAR_COLOR_OPTIONS = [
  { value: 'zinc', label: 'Cinza', dot: 'bg-zinc-400', chip: 'bg-zinc-100 text-zinc-700' },
  { value: 'green', label: 'Verde', dot: 'bg-[#2F9E41]', chip: 'bg-[#2F9E41]/10 text-[#2F9E41]' },
  { value: 'blue', label: 'Azul', dot: 'bg-blue-500', chip: 'bg-blue-100 text-blue-700' },
  { value: 'amber', label: 'Âmbar', dot: 'bg-amber-500', chip: 'bg-amber-100 text-amber-700' },
  { value: 'rose', label: 'Rosa', dot: 'bg-rose-500', chip: 'bg-rose-100 text-rose-700' },
  { value: 'purple', label: 'Roxo', dot: 'bg-purple-500', chip: 'bg-purple-100 text-purple-700' },
  { value: 'red', label: 'Vermelho', dot: 'bg-red-500', chip: 'bg-red-100 text-red-700' },
] as const

export const CALENDAR_EXCEL_BG: Record<string, { bg: string; fg: string }> = {
  zinc: { bg: 'FFFFFFFF', fg: 'FF000000' },
  green: { bg: 'FFD4F0DC', fg: 'FF1C5C2E' },
  blue: { bg: 'FFD6E6F5', fg: 'FF1F4E79' },
  amber: { bg: 'FFFFD966', fg: 'FF7F5F00' },
  rose: { bg: 'FFE8A8A0', fg: 'FF7A2E2E' },
  purple: { bg: 'FFE2D5F0', fg: 'FF4B2A6E' },
  red: { bg: 'FFF4B5B5', fg: 'FF7F1D1D' },
}

export function calendarItemExcelBg(color: string | null): { bg: string; fg: string } {
  return CALENDAR_EXCEL_BG[color ?? 'zinc'] ?? CALENDAR_EXCEL_BG.zinc
}

export function calendarItemDot(color: string | null): string {
  const found = CALENDAR_COLOR_OPTIONS.find((c) => c.value === color)
  return found?.dot ?? 'bg-zinc-400'
}

export function calendarItemChip(color: string | null): string {
  const found = CALENDAR_COLOR_OPTIONS.find((c) => c.value === color)
  return found?.chip ?? 'bg-zinc-100 text-zinc-700'
}
