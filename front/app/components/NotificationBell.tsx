'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'
import UserAvatar from '@/app/components/UserAvatar'

type Notification = {
  id: string
  type: 'comment' | 'reply' | 'comment_reply' | 'reaction' | 'comment_reaction' | 'event_reminder' | 'mention' | 'review_request' | 'content_approved' | 'content_rejected' | 'admin_announcement'
  target_type: 'article' | 'project' | 'forum_topic' | 'event' | 'announcement' | null
  target_id: string | null
  target_title: string | null
  message: string | null
  link_url: string | null
  read: boolean
  created_at: string
  actor: { name: string; avatar_url: string | null } | null
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + '…' : s
}

function notifText(n: Notification): string {
  const title = n.target_title ? `"${truncate(n.target_title, 32)}"` : ''

  if (n.type === 'admin_announcement') {
    return n.target_title ? truncate(n.target_title, 60) : 'Comunicado da administração'
  }

  if (n.type === 'event_reminder') {
    return `Lembrete: o evento ${title} está chegando`
  }

  const actor = n.actor?.name ?? 'Alguém'
  const kind = n.target_type === 'article' ? 'artigo' : 'projeto'

  if (n.type === 'review_request') {
    return `${actor} enviou o ${kind} ${title} para aprovação`
  }
  if (n.type === 'content_approved') {
    return `Seu ${kind} ${title} foi aprovado`
  }
  if (n.type === 'content_rejected') {
    return `Seu ${kind} ${title} precisa de ajustes`
  }

  if (n.target_type === 'forum_topic') {
    if (n.type === 'comment_reply') return `${actor} respondeu ao seu comentário no tópico ${title}`
    return `${actor} respondeu ao seu tópico ${title}`
  }

  if (n.type === 'mention') {
    const where = n.target_type === 'article' ? 'artigo' : n.target_type === 'event' ? 'evento' : 'projeto'
    return `${actor} mencionou você em um ${where} ${title}`
  }

  switch (n.type) {
    case 'comment':          return `${actor} comentou no seu ${kind} ${title}`
    case 'reply':            return `${actor} respondeu seu comentário em ${title}`
    case 'reaction':         return `${actor} reagiu ao seu ${kind} ${title}`
    case 'comment_reaction': return `${actor} reagiu ao seu comentário em ${title}`
    default:                 return `${actor} interagiu com ${title}`
  }
}

function notifUrl(n: Notification): string | null {
  if (n.type === 'admin_announcement') return n.link_url ?? null
  if (n.type === 'review_request') {
    return n.target_type === 'article' ? '/admin/artigos' : '/admin/projetos'
  }
  if (n.type === 'content_rejected') {
    return n.target_type === 'article'
      ? `/artigos/${n.target_id}/editar`
      : `/projetos/${n.target_id}/editar`
  }
  if (n.target_type === 'event')       return `/eventos/${n.target_id}`
  if (n.target_type === 'forum_topic') return `/forum/${n.target_id}`
  if (n.target_type === 'article')     return `/artigos/${n.target_id}`
  if (n.target_id) return `/projetos/${n.target_id}`
  return null
}

export default function NotificationBell({ userId }: { userId: string | null }) {
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)

  const load = useCallback(async () => {
    if (!userId) return

    const { data } = await supabase
      .from('notifications')
      .select('id, type, target_type, target_id, target_title, message, link_url, read, created_at, users!notifications_actor_id_fkey(name, avatar_url)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(25)

    if (!data) return
    const mapped: Notification[] = data.map((n) => ({
      id: n.id,
      type: n.type as Notification['type'],
      target_type: n.target_type as Notification['target_type'],
      target_id: n.target_id,
      target_title: n.target_title,
      message: n.message ?? null,
      link_url: n.link_url ?? null,
      read: n.read,
      created_at: n.created_at,
      actor: n.users as unknown as { name: string; avatar_url: string | null } | null,
    }))
    setNotifications(mapped)
    setUnread(mapped.filter((n) => !n.read).length)
  }, [userId])

  useEffect(() => {
    if (!userId) return
    queueMicrotask(() => void load())

    const channel = supabase
      .channel(`notif-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, load])

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  async function markAllRead() {
    if (!userId || unread === 0) return
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnread(0)
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
  }

  async function handleOpen() {
    const next = !open
    setOpen(next)
    if (next) markAllRead()
  }

  function handleClick(n: Notification) {
    setOpen(false)
    const url = notifUrl(n)
    if (url) router.push(url)
  }

  if (!userId) {
    return (
      <button className="relative rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200" disabled>
        <BellIcon />
      </button>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        title="Notificações"
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-0.5 text-[9px] font-bold leading-none text-white dark:border-zinc-950">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-4 top-18 z-50 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Notificações</span>
            {notifications.some((n) => n.read) && unread === 0 && notifications.length > 0 && (
              <span className="text-xs text-zinc-400">Tudo lido</span>
            )}
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-zinc-400 transition hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-zinc-400">Nenhuma notificação ainda</p>
            </div>
          ) : (
            <div className="max-h-[420px] divide-y divide-zinc-50 overflow-y-auto dark:divide-zinc-800">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-900 ${!n.read ? 'bg-green-50/40 dark:bg-green-950/20' : ''}`}
                >
                  {n.type === 'admin_announcement' ? (
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 11l19-9-9 19-2-8-8-2z" />
                      </svg>
                    </div>
                  ) : n.type === 'event_reminder' ? (
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2F9E41]/10 text-[#2F9E41]">
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 2v4M16 2v4M3 10h18" />
                        <rect x={3} y={4} width={18} height={18} rx={2} />
                      </svg>
                    </div>
                  ) : n.actor?.avatar_url ? (
                    <Image
                      src={n.actor.avatar_url}
                      alt={n.actor.name}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
                    />
                  ) : (
                    <UserAvatar name={n.actor?.name} className="mt-0.5 h-8 w-8" sizes="32px" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-snug text-zinc-700 dark:text-zinc-200">{notifText(n)}</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: '#2F9E41' }} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BellIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}
