'use client'

import { useEffect, useMemo, useState } from 'react'
import Select from '@/app/components/Select'
import { LoadingState } from '@/app/components/LoadingScreen'
import { supabase } from '@/app/lib/supabase'

type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE'

type AuditLog = {
  id: string
  created_at: string
  actor_user_id: string | null
  actor_email: string | null
  action: AuditAction
  table_name: string
  record_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
}

const actionLabel: Record<AuditAction, string> = {
  INSERT: 'Criação',
  UPDATE: 'Alteração',
  DELETE: 'Exclusão',
}

const actionClass: Record<AuditAction, string> = {
  INSERT: 'bg-green-50 text-green-700',
  UPDATE: 'bg-amber-50 text-amber-700',
  DELETE: 'bg-red-50 text-red-700',
}

const actionFilterOptions = [
  { value: '', label: 'Todas' },
  { value: 'INSERT', label: 'Criações' },
  { value: 'UPDATE', label: 'Alterações' },
  { value: 'DELETE', label: 'Exclusões' },
]

export default function AdminAuditoriaPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tableFilter, setTableFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, created_at, actor_user_id, actor_email, action, table_name, record_id, old_data, new_data')
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) {
        setError(error.message)
      } else {
        setLogs((data as AuditLog[]) ?? [])
      }
      setLoading(false)
    }

    load()
  }, [])

  const tables = useMemo(
    () => Array.from(new Set(logs.map((log) => log.table_name))).sort(),
    [logs]
  )

  const tableOptions = useMemo(
    () => tables.map((table) => ({ value: table, label: table })),
    [tables]
  )

  const filteredLogs = logs.filter((log) => {
    if (tableFilter && log.table_name !== tableFilter) return false
    if (actionFilter && log.action !== actionFilter) return false
    return true
  })

  if (loading) return <LoadingState message="Carregando auditoria" />

  const hasFilters = tableFilter !== '' || actionFilter !== ''

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Auditoria</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Últimas ações registradas no sistema.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end lg:w-auto">
          <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-zinc-500 sm:w-56">
            Tabela
            <Select
              value={tableFilter}
              onChange={setTableFilter}
              options={tableOptions}
              placeholder="Todas as tabelas"
            />
          </label>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-500">Ação</span>
            <div className="flex w-full gap-1 rounded-lg border border-zinc-200 bg-white p-1 sm:w-auto">
              {actionFilterOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setActionFilter(option.value)}
                  className={`flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition sm:flex-none ${
                    actionFilter === option.value ? 'bg-[#2F9E41] text-white' : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setTableFilter('')
                setActionFilter('')
              }}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-900 sm:mb-0.5"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">Não foi possível carregar os logs.</p>
          <p className="mt-1">{error}</p>
          <p className="mt-3 text-red-600">
            Confirme se o SQL `supabase_audit_logs.sql` já foi executado no Supabase.
          </p>
        </div>
      )}

      {!error && filteredLogs.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-12 text-center">
          <p className="text-sm text-zinc-400">Nenhum log encontrado.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <div className="divide-y divide-zinc-100">
            {filteredLogs.map((log) => (
              <AuditLogRow
                key={log.id}
                log={log}
                expanded={expanded === log.id}
                onToggle={() => setExpanded((current) => current === log.id ? null : log.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function AuditLogRow({
  log,
  expanded,
  onToggle,
}: {
  log: AuditLog
  expanded: boolean
  onToggle: () => void
}) {
  const date = new Date(log.created_at)
  const formatted = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col gap-3 px-4 py-4 text-left transition hover:bg-zinc-50 md:flex-row md:items-center md:justify-between"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${actionClass[log.action]}`}>
              {actionLabel[log.action]}
            </span>
            <span className="text-sm font-semibold text-zinc-900">{log.table_name}</span>
            {log.record_id && <span className="text-xs text-zinc-400">#{log.record_id}</span>}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {log.actor_email ?? log.actor_user_id ?? 'Sistema ou visitante'} · {formatted}
          </p>
        </div>
        <svg
          className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {expanded && (
        <div className="grid gap-3 border-t border-zinc-100 bg-zinc-50 px-4 py-4 md:grid-cols-2">
          <JsonBlock title="Antes" data={log.old_data} />
          <JsonBlock title="Depois" data={log.new_data} />
        </div>
      )}
    </div>
  )
}

function JsonBlock({ title, data }: { title: string; data: Record<string, unknown> | null }) {
  return (
    <div className="min-w-0 rounded-xl border border-zinc-200 bg-white p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">{title}</p>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-600">
        {data ? JSON.stringify(data, null, 2) : '-'}
      </pre>
    </div>
  )
}
