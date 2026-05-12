'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

type Message = {
  id: string
  name: string
  email: string
  subject: string | null
  message: string
  created_at: string
}

export default function MensagensPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem('admin_msgs_last_seen', new Date().toISOString())

    supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setMessages((data as Message[]) ?? [])
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('admin-contact-messages-page')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contact_messages' }, (payload) => {
        setMessages((prev) => [payload.new as Message, ...prev])
        localStorage.setItem('admin_msgs_last_seen', new Date().toISOString())
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Mensagens de Contato</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Mensagens recebidas pelo formulário de contato da plataforma.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-zinc-400">Carregando…</div>
      ) : messages.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-12 text-center">
          <p className="text-sm text-zinc-400">Nenhuma mensagem recebida ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-zinc-400">{messages.length} {messages.length === 1 ? 'mensagem' : 'mensagens'}</p>
          {messages.map((msg) => (
            <MessageCard
              key={msg.id}
              msg={msg}
              expanded={expanded === msg.id}
              onToggle={() => setExpanded(expanded === msg.id ? null : msg.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function MessageCard({
  msg,
  expanded,
  onToggle,
}: {
  msg: Message
  expanded: boolean
  onToggle: () => void
}) {
  const date = new Date(msg.created_at)
  const formatted = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-5 py-4 flex items-start gap-4 hover:bg-zinc-50 transition"
      >
        <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center shrink-0 text-sm font-semibold text-zinc-500 mt-0.5">
          {msg.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="font-semibold text-sm text-zinc-900">{msg.name}</span>
            <span className="text-xs text-zinc-400 shrink-0">{formatted}</span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">{msg.email}</p>
          {msg.subject && (
            <p className="text-xs font-medium text-zinc-600 mt-1 truncate">{msg.subject}</p>
          )}
          {!expanded && (
            <p className="text-sm text-zinc-400 mt-1.5 truncate">{msg.message}</p>
          )}
        </div>
        <svg
          className={`shrink-0 mt-1 h-4 w-4 text-zinc-400 transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {expanded && (
        <div className="px-5 pb-5 pt-3 border-t border-zinc-100">
          <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{msg.message}</p>
          <div className="mt-4">
            <a
              href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject ?? 'Sua mensagem')}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-700 transition"
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Responder por e-mail
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
