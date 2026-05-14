'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'
import UserAvatar from '@/app/components/UserAvatar'

type Notification = {
  id: string
  type: 'comment' | 'reply' | 'reaction' | 'comment_reaction'
  target_type: 'article' | 'project' | 'forum_topic'
  target_id: string
  target_title: string | null
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
  const actor = n.actor?.name ?? 'Alguém'
  const title = n.target_title ? `"${truncate(n.target_title, 32)}"` : ''

  if (n.target_type === 'forum_topic') {
    return `${actor} respondeu ao seu tópico ${title}`
  }

  const kind = n.target_type === 'article' ? 'artigo' : 'projeto'
  switch (n.type) {
    case 'comment':          return `${actor} comentou no seu ${kind} ${title}`
    case 'reply':            return `${actor} respondeu seu comentário em ${title}`
    case 'reaction':         return `${actor} reagiu ao seu ${kind} ${title}`
    case 'comment_reaction': return `${actor} reagiu ao seu comentário em ${title}`
    default:                 return `${actor} interagiu com ${title}`
  }
}

function notifUrl(n: Notification): string {
  if (n.target_type === 'forum_topic') return `/forum/${n.target_id}`
  if (n.target_type === 'article')     return `/artigos/${n.target_id}`
  return `/projetos/${n.target_id}`
}

export default function NotificationBell({ userId }: { userId: string | null }) {
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!userId) return
    load()

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
  }, [userId])

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  async function load() {
    const { data } = await supabase
      .from('notifications')
      .select('id, type, target_type, target_id, target_title, read, created_at, users!notifications_actor_id_fkey(name, avatar_url)')
      .eq('user_id', userId!)
      .order('created_at', { ascending: false })
      .limit(25)

    if (!data) return
    const mapped: Notification[] = data.map((n) => ({
      id: n.id,
      type: n.type as Notification['type'],
      target_type: n.target_type as Notification['target_type'],
      target_id: n.target_id,
      target_title: n.target_title,
      read: n.read,
      created_at: n.created_at,
      actor: n.users as unknown as { name: string; avatar_url: string | null } | null,
    }))
    setNotifications(mapped)
    setUnread(mapped.filter((n) => !n.read).length)
  }

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
    router.push(notifUrl(n))
  }

  if (!userId) {
    return (
      <button className="relative text-zinc-400 hover:text-zinc-700 transition p-1.5 rounded-lg hover:bg-zinc-100" disabled>
        <BellIcon />
      </button>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative text-zinc-400 hover:text-zinc-700 transition p-1.5 rounded-lg hover:bg-zinc-100"
        title="Notificações"
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-red-500 border-2 border-white flex items-center justify-center text-[9px] font-bold text-white px-0.5 leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-4 top-18 z-50 rounded-xl border border-zinc-200 bg-white shadow-xl overflow-hidden sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
            <span className="text-sm font-semibold text-zinc-900">Notificações</span>
            {notifications.some((n) => n.read) && unread === 0 && notifications.length > 0 && (
              <span className="text-xs text-zinc-400">Tudo lido</span>
            )}
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-zinc-400 hover:text-zinc-700 transition"
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
            <div className="max-h-[420px] overflow-y-auto divide-y divide-zinc-50">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-zinc-50 transition ${!n.read ? 'bg-green-50/40' : ''}`}
                >
                  {n.actor?.avatar_url ? (
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
                    <p className="text-xs text-zinc-700 leading-snug">{notifText(n)}</p>
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
