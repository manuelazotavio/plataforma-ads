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

type PageView = {
  id: string
  created_at: string
  path: string
  ip: string | null
  user_agent: string | null
  user_id: string | null
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

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function parseDevice(ua: string | null) {
  if (!ua) return 'Desconhecido'
  if (/mobile|android|iphone|ipad/i.test(ua)) return 'Mobile'
  if (/tablet/i.test(ua)) return 'Tablet'
  return 'Desktop'
}

function parseBrowser(ua: string | null) {
  if (!ua) return ''
  if (/Edg\//i.test(ua)) return 'Edge'
  if (/OPR\//i.test(ua)) return 'Opera'
  if (/Chrome\//i.test(ua)) return 'Chrome'
  if (/Firefox\//i.test(ua)) return 'Firefox'
  if (/Safari\//i.test(ua)) return 'Safari'
  return 'Outro'
}

export default function AdminAuditoriaPage() {
  const [tab, setTab] = useState<'logs' | 'visitas'>('logs')

  
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [logsError, setLogsError] = useState<string | null>(null)
  const [tableFilter, setTableFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  
  const [views, setViews] = useState<PageView[]>([])
  const [viewsLoading, setViewsLoading] = useState(false)
  const [viewsError, setViewsError] = useState<string | null>(null)
  const [pathFilter, setPathFilter] = useState('')
  const [ipFilter, setIpFilter] = useState('')
  const [dayRange, setDayRange] = useState('7')

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, created_at, actor_user_id, actor_email, action, table_name, record_id, old_data, new_data')
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) setLogsError(error.message)
      else setLogs((data as AuditLog[]) ?? [])
      setLogsLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (tab !== 'visitas') return
    setViewsLoading(true)
    const since = new Date(Date.now() - Number(dayRange) * 24 * 60 * 60 * 1000).toISOString()
    supabase
      .from('page_views')
      .select('id, created_at, path, ip, user_agent, user_id')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data, error }) => {
        if (error) setViewsError(error.message)
        else setViews((data as PageView[]) ?? [])
        setViewsLoading(false)
      })
  }, [tab, dayRange])

  
  const tables = useMemo(() => Array.from(new Set(logs.map(l => l.table_name))).sort(), [logs])
  const tableOptions = useMemo(() => tables.map(t => ({ value: t, label: t })), [tables])
  const filteredLogs = logs.filter(log => {
    if (tableFilter && log.table_name !== tableFilter) return false
    if (actionFilter && log.action !== actionFilter) return false
    return true
  })

  
  const filteredViews = useMemo(() => views.filter(v => {
    if (pathFilter && !v.path.includes(pathFilter)) return false
    if (ipFilter && !(v.ip ?? '').includes(ipFilter)) return false
    return true
  }), [views, pathFilter, ipFilter])

  const uniqueIPs = useMemo(() => new Set(filteredViews.map(v => v.ip).filter(Boolean)).size, [filteredViews])
  const topPages = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredViews.forEach(v => { counts[v.path] = (counts[v.path] ?? 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [filteredViews])

  if (logsLoading) return <LoadingState message="Carregando auditoria" />

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Auditoria</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Logs de alterações e visitações na plataforma.</p>
        </div>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl border border-zinc-200 bg-white p-1 w-fit">
        {([['logs', 'Logs de alterações'], ['visitas', 'Visitações']] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${tab === key ? 'bg-[#2F9E41] text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            {label}
          </button>
        ))}
      </div>

      
      {tab === 'logs' && (
        <>
          <div className="mb-6 flex w-full flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-zinc-500 sm:w-56">
              Tabela
              <Select value={tableFilter} onChange={setTableFilter} options={tableOptions} placeholder="Todas as tabelas" />
            </label>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-500">Ação</span>
              <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1">
                {actionFilterOptions.map(o => (
                  <button key={o.value} type="button" onClick={() => setActionFilter(o.value)}
                    className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition ${actionFilter === o.value ? 'bg-[#2F9E41] text-white' : 'text-zinc-500 hover:text-zinc-900'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            {(tableFilter || actionFilter) && (
              <button type="button" onClick={() => { setTableFilter(''); setActionFilter('') }}
                className="self-end rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-500 transition hover:bg-zinc-50">
                Limpar
              </button>
            )}
          </div>

          {logsError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-medium">Não foi possível carregar os logs.</p>
              <p className="mt-1">{logsError}</p>
            </div>
          )}

          {filteredLogs.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-12 text-center">
              <p className="text-sm text-zinc-400">Nenhum log encontrado.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <div className="divide-y divide-zinc-100">
                {filteredLogs.map(log => (
                  <AuditLogRow key={log.id} log={log} expanded={expanded === log.id}
                    onToggle={() => setExpanded(c => c === log.id ? null : log.id)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

  
      {tab === 'visitas' && (
        <>
          {viewsLoading ? (
            <LoadingState message="Carregando visitações" />
          ) : viewsError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{viewsError}</div>
          ) : (
            <>
            
              <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Total de visitas" value={filteredViews.length} />
                <StatCard label="IPs únicos" value={uniqueIPs} />
                <StatCard label="Usuários logados" value={filteredViews.filter(v => v.user_id).length} />
                <StatCard label="Anônimos" value={filteredViews.filter(v => !v.user_id).length} />
              </div>

              {topPages.length > 0 && (
                <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Páginas mais acessadas</p>
                  <div className="flex flex-col gap-2">
                    {topPages.map(([path, count]) => (
                      <div key={path} className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="h-5 overflow-hidden rounded-full bg-zinc-100">
                            <div
                              className="h-full rounded-full bg-[#2F9E41]/20"
                              style={{ width: `${Math.round((count / topPages[0][1]) * 100)}%` }}
                            />
                          </div>
                        </div>
                        <span className="w-6 shrink-0 text-right text-xs font-bold text-zinc-700">{count}</span>
                        <span className="w-48 shrink-0 truncate text-xs text-zinc-500">{path}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

          
              <div className="mb-4 flex flex-wrap gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-zinc-500">Período</span>
                  <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1">
                    {[['1', 'Hoje'], ['7', '7 dias'], ['30', '30 dias']].map(([v, l]) => (
                      <button key={v} type="button" onClick={() => setDayRange(v)}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${dayRange === v ? 'bg-[#2F9E41] text-white' : 'text-zinc-500 hover:text-zinc-900'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-zinc-500">Filtrar por página</span>
                  <input value={pathFilter} onChange={e => setPathFilter(e.target.value)} placeholder="/forum, /loja…"
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-xs outline-none focus:border-zinc-400" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-zinc-500">Filtrar por IP</span>
                  <input value={ipFilter} onChange={e => setIpFilter(e.target.value)} placeholder="192.168…"
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-xs outline-none focus:border-zinc-400" />
                </label>
              </div>

              {filteredViews.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-12 text-center">
                  <p className="text-sm text-zinc-400">Nenhuma visita registrada neste período.</p>
                  <p className="mt-1 text-xs text-zinc-400">As visitas são registradas a partir de agora.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                  <div className="divide-y divide-zinc-100">
                    {filteredViews.map(v => (
                      <div key={v.id} className="flex flex-col gap-1 px-4 py-3 text-xs sm:flex-row sm:items-center sm:gap-4">
                        <span className="w-36 shrink-0 text-zinc-400">{fmtDate(v.created_at)}</span>
                        <span className="min-w-0 flex-1 truncate font-medium text-zinc-800">{v.path}</span>
                        <span className="w-28 shrink-0 font-mono text-zinc-500">{v.ip ?? '—'}</span>
                        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600">{parseDevice(v.user_agent)}</span>
                        <span className="shrink-0 text-zinc-400">{parseBrowser(v.user_agent)}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 font-medium ${v.user_id ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                          {v.user_id ? 'Logado' : 'Anônimo'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-zinc-900">{value}</p>
    </div>
  )
}

function AuditLogRow({ log, expanded, onToggle }: { log: AuditLog; expanded: boolean; onToggle: () => void }) {
  return (
    <div>
      <button type="button" onClick={onToggle}
        className="flex w-full flex-col gap-3 px-4 py-4 text-left transition hover:bg-zinc-50 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${actionClass[log.action]}`}>
              {actionLabel[log.action]}
            </span>
            <span className="text-sm font-semibold text-zinc-900">{log.table_name}</span>
            {log.record_id && <span className="text-xs text-zinc-400">#{log.record_id}</span>}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {log.actor_email ?? log.actor_user_id ?? 'Sistema ou visitante'} · {fmtDate(log.created_at)}
          </p>
        </div>
        <svg className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20" fill="currentColor">
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
