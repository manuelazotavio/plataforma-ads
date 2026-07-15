'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { getAuthUser } from '@/app/lib/auth'
import { LoadingState } from '@/app/components/LoadingScreen'

type UserOption = { id: string; name: string }

type AnnouncementLog = {
  id: string
  title: string
  message: string
  link_url: string | null
  recipient_type: 'all' | 'user'
  recipient_count: number
  sent_at: string
  recipient: { name: string } | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function NotificacoesAdminPage() {
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [recipientType, setRecipientType] = useState<'all' | 'user'>('all')
  const [userSearch, setUserSearch] = useState('')
  const [userOptions, setUserOptions] = useState<UserOption[]>([])
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null)

  const [history, setHistory] = useState<AnnouncementLog[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    loadHistory()
    setLoading(false)
  }, [])

  async function loadHistory() {
    const { data } = await supabase
      .from('admin_announcements')
      .select('id, title, message, link_url, recipient_type, recipient_count, sent_at, users!admin_announcements_recipient_id_fkey(name)')
      .order('sent_at', { ascending: false })
      .limit(50)

    if (!data) return
    setHistory(data.map((row) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      link_url: row.link_url,
      recipient_type: row.recipient_type as 'all' | 'user',
      recipient_count: row.recipient_count,
      sent_at: row.sent_at,
      recipient: row.users as { name: string } | null,
    })))
  }

  useEffect(() => {
    if (recipientType !== 'user' || userSearch.trim().length < 2) {
      setUserOptions([])
      return
    }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from('users')
        .select('id, name')
        .ilike('name', `%${userSearch}%`)
        .limit(8)
      setUserOptions((data ?? []) as UserOption[])
    }, 300)
    return () => clearTimeout(timeout)
  }, [userSearch, recipientType])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !message.trim()) return
    if (recipientType === 'user' && !selectedUser) {
      setError('Selecione um destinatário.')
      return
    }

    setSending(true)
    setError(null)
    setSuccess(false)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError('Sessão expirada.'); setSending(false); return }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const res = await fetch(`${supabaseUrl}/functions/v1/send-admin-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          link_url: linkUrl.trim() || null,
          recipient_id: recipientType === 'user' ? selectedUser?.id ?? null : null,
        }),
      })

      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Erro ao enviar.'); setSending(false); return }

      setSuccess(true)
      setTitle('')
      setMessage('')
      setLinkUrl('')
      setSelectedUser(null)
      setUserSearch('')
      setRecipientType('all')
      await loadHistory()
    } catch (err) {
      setError(String(err))
    } finally {
      setSending(false)
    }
  }

  if (loading) return <LoadingState />

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Enviar Notificação</h1>
        <p className="mt-1 text-sm text-zinc-500">O destinatário receberá a notificação no sistema e por email.</p>
      </div>

      <form onSubmit={handleSend} className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Título *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={120}
            placeholder="Ex: Inscrições abertas para o Hackathon"
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#2F9E41] focus:ring-2 focus:ring-[#2F9E41]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Mensagem *</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            rows={5}
            placeholder="Texto completo da notificação..."
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#2F9E41] focus:ring-2 focus:ring-[#2F9E41]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Link (opcional)</label>
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            type="url"
            placeholder="https://..."
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#2F9E41] focus:ring-2 focus:ring-[#2F9E41]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <p className="mt-1 text-[11px] text-zinc-400">Aparece como botão "Ver no ADS Conecta" no email e como link na notificação.</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Destinatário</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setRecipientType('all'); setSelectedUser(null); setUserSearch('') }}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${recipientType === 'all' ? 'border-[#2F9E41] bg-[#2F9E41]/10 text-[#2F9E41]' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400'}`}
            >
              Todos os usuários
            </button>
            <button
              type="button"
              onClick={() => setRecipientType('user')}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${recipientType === 'user' ? 'border-[#2F9E41] bg-[#2F9E41]/10 text-[#2F9E41]' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400'}`}
            >
              Usuário específico
            </button>
          </div>

          {recipientType === 'user' && (
            <div className="mt-3 relative">
              {selectedUser ? (
                <div className="flex items-center gap-2 rounded-lg border border-[#2F9E41] bg-[#2F9E41]/5 px-3 py-2">
                  <span className="flex-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">{selectedUser.name}</span>
                  <button type="button" onClick={() => { setSelectedUser(null); setUserSearch('') }} className="text-xs text-zinc-400 hover:text-zinc-600">Trocar</button>
                </div>
              ) : (
                <>
                  <input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Buscar usuário pelo nome..."
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#2F9E41] focus:ring-2 focus:ring-[#2F9E41]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  {userOptions.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                      {userOptions.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => { setSelectedUser(u); setUserSearch(''); setUserOptions([]) }}
                          className="flex w-full items-center px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                          {u.name}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">{error}</div>
        )}
        {success && (
          <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-400">Notificação enviada com sucesso!</div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={sending}
            className="flex items-center gap-2 rounded-lg bg-[#2F9E41] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#27883a] disabled:opacity-60"
          >
            {sending ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx={12} cy={12} r={10} stroke="currentColor" strokeWidth={4} />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Enviando...
              </>
            ) : 'Enviar notificação'}
          </button>
        </div>
      </form>

      {history.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Histórico de envios</h2>
          <div className="space-y-2">
            {history.map((item) => (
              <div key={item.id} className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
                <button
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{item.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {formatDate(item.sent_at)} · {item.recipient_type === 'all' ? `${item.recipient_count} usuários` : item.recipient?.name ?? 'Usuário'}
                    </p>
                  </div>
                  <svg className={`mt-0.5 h-4 w-4 shrink-0 text-zinc-400 transition-transform ${expandedId === item.id ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {expandedId === item.id && (
                  <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-3 space-y-2">
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-line">{item.message}</p>
                    {item.link_url && (
                      <a href={item.link_url} target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-[#2F9E41] underline underline-offset-2 break-all">
                        {item.link_url}
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
