'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { getAuthUser } from '@/app/lib/auth'
import UserAvatar from '@/app/components/UserAvatar'

export type ReactionType = 'like' | 'love' | 'celebrate' | 'insightful' | 'support'

export const REACTIONS: {
  type: ReactionType
  label: string
  color: string
  icon: React.ReactNode
}[] = [
  {
    type: 'like',
    label: 'Curtir',
    color: 'text-blue-500',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 0 1 6 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V3a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23h-.777ZM2.331 10.977a11.969 11.969 0 0 0-.831 4.398 12 12 0 0 0 .52 3.507c.26.85 1.084 1.368 1.973 1.368H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 0 1-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227Z" />
      </svg>
    ),
  },
  {
    type: 'love',
    label: 'Amei',
    color: 'text-rose-500',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
      </svg>
    ),
  },
  {
    type: 'celebrate',
    label: 'Parabéns',
    color: 'text-amber-500',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036a2.25 2.25 0 0 0 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258a2.25 2.25 0 0 0-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.25 2.25 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.25 2.25 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183a1.5 1.5 0 0 0 .95.95l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395a1.5 1.5 0 0 0-.95.95l-.394 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.95-.95l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395a1.5 1.5 0 0 0 .95-.95l.395-1.183A.75.75 0 0 1 16.5 15Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    type: 'insightful',
    label: 'Interessante',
    color: 'text-yellow-500',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <path d="M12 .75a8.25 8.25 0 0 1 6.803 12.926c-.892 1.16-1.553 2.507-1.553 3.824v.375a1.5 1.5 0 0 1-1.5 1.5H8.25a1.5 1.5 0 0 1-1.5-1.5v-.375c0-1.317-.661-2.664-1.553-3.824A8.25 8.25 0 0 1 12 .75Z" />
        <path fillRule="evenodd" d="M9.013 19.9a.75.75 0 0 1 .75-.713h4.474a.75.75 0 0 1 .75.713l.013.087A1.5 1.5 0 0 1 13.5 21.75h-3a1.5 1.5 0 0 1-1.5-1.75l.013-.1Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    type: 'support',
    label: 'Apoio',
    color: 'text-purple-500',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
      </svg>
    ),
  },
]

function ReactionIcon({ type, size = 20 }: { type: ReactionType; size?: number }) {
  const r = REACTIONS.find(r => r.type === type)!
  return (
    <span className={`inline-flex shrink-0 ${r.color}`} style={{ width: size, height: size }}>
      {r.icon}
    </span>
  )
}

export function ReactionPicker({
  myReaction,
  onReact,
  size = 'md',
}: {
  myReaction: ReactionType | null
  onReact: (type: ReactionType) => void
  size?: 'sm' | 'md'
}) {
  const iconSize = size === 'sm' ? 22 : 28

  function animateReactionIcon(button: HTMLButtonElement, active: boolean, selected: boolean) {
    const icon = button.querySelector<HTMLElement>('[data-reaction-icon]')
    if (!icon) return

    icon.getAnimations().forEach((animation) => animation.cancel())
    icon.animate(
      [
        { transform: getComputedStyle(icon).transform === 'none' ? 'translateY(0) scale(1)' : getComputedStyle(icon).transform },
        {
          transform: active
            ? 'translateY(-7px) scale(1.6)'
            : selected
              ? 'translateY(-2px) scale(1.15)'
              : 'translateY(0) scale(1)',
        },
      ],
      {
        duration: active ? 360 : 420,
        easing: active ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' : 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards',
      }
    )
  }

  return (
    <div className="no-scrollbar flex items-end gap-0.5 overflow-x-auto overscroll-x-contain rounded-2xl border border-zinc-100 bg-white px-2 pb-2 pt-4 shadow-xl max-w-[calc(100vw-2rem)]">
      {REACTIONS.map((r) => (
        <button
          key={r.type}
          data-reaction-option
          onClick={() => onReact(r.type)}
          onMouseEnter={(event) => animateReactionIcon(event.currentTarget, true, myReaction === r.type)}
          onMouseLeave={(event) => animateReactionIcon(event.currentTarget, false, myReaction === r.type)}
          title={r.label}
          className={`reaction-option flex w-14 shrink-0 flex-col items-center gap-1 rounded-xl px-2 py-1 transition-colors duration-300 hover:bg-zinc-50 ${
            myReaction === r.type ? 'bg-zinc-50' : ''
          }`}
        >
          <span
            className="reaction-option-icon inline-flex"
            data-reaction-icon
            data-selected={myReaction === r.type ? 'true' : 'false'}
          >
            <ReactionIcon type={r.type} size={iconSize} />
          </span>
          <span className="reaction-option-label whitespace-nowrap text-[9px] font-medium leading-none text-zinc-400">
            {r.label}
          </span>
        </button>
      ))}
    </div>
  )
}

type Props = {
  type: 'project' | 'article' | 'event'
  targetId: string
  initialCount: number
  label?: string
  variant?: 'default' | 'action'
  className?: string
  summaryTargetId?: string
}

type ReactionUser = {
  id: string
  name: string
  avatarUrl: string | null
  reactionType: ReactionType
}

export default function LikeButton({
  type,
  targetId,
  initialCount,
  label,
  variant = 'default',
  className = '',
  summaryTargetId,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const table = type === 'project' ? 'project_likes' : type === 'article' ? 'article_likes' : 'event_likes'
  const field = type === 'project' ? 'project_id' : type === 'article' ? 'article_id' : 'event_id'

  const [userId, setUserId]         = useState<string | null>(null)
  const [myReaction, setMyReaction] = useState<ReactionType | null>(null)
  const [counts, setCounts]         = useState<Record<string, number>>({})
  const [open, setOpen]             = useState(false)
  const [loading, setLoading]       = useState(false)
  const [peopleOpen, setPeopleOpen] = useState(false)
  const [peopleLoading, setPeopleLoading] = useState(false)
  const [peopleError, setPeopleError] = useState<string | null>(null)
  const [reactionUsers, setReactionUsers] = useState<ReactionUser[]>([])
  const [summaryTarget, setSummaryTarget] = useState<HTMLElement | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const hoverCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const total = Object.values(counts).reduce((a, c) => a + c, 0) || initialCount
  const topTypes = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([reactionType]) => reactionType as ReactionType)
  const reactionData = REACTIONS.find(r => r.type === myReaction)

  useEffect(() => {
    if (!summaryTargetId) return
    setSummaryTarget(document.getElementById(summaryTargetId))
  }, [summaryTargetId])

  useEffect(() => {
    getAuthUser().then((user) => {
      if (!user) return
      setUserId(user.id)
      supabase.from(table).select('reaction_type').eq(field, targetId).eq('user_id', user.id).maybeSingle()
        .then(({ data }) => setMyReaction((data?.reaction_type as ReactionType) ?? null))
    })
    supabase.from(table).select('reaction_type').eq(field, targetId).then(({ data }) => {
      if (!data) return
      const c: Record<string, number> = {}
      data.forEach(r => { c[r.reaction_type] = (c[r.reaction_type] ?? 0) + 1 })
      setCounts(c)
    })
  }, [table, field, targetId])

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  useEffect(() => {
    return () => {
      if (hoverCloseTimeoutRef.current) clearTimeout(hoverCloseTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (!open || !pickerRef.current) return

    const picker = pickerRef.current
    const animation = picker.animate(
      [
        { opacity: 0, transform: 'translateY(28px)' },
        { opacity: 0.7, transform: 'translateY(10px)', offset: 0.45 },
        { opacity: 1, transform: 'translateY(-4px)', offset: 0.78 },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      {
        duration: 850,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'both',
      }
    )

    const optionAnimations = Array.from(
      picker.querySelectorAll<HTMLElement>('[data-reaction-option]')
    ).map((option, index) => option.animate(
      [
        { opacity: 0, transform: 'translateY(14px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      {
        duration: 360,
        delay: 160 + index * 90,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'backwards',
      }
    ))

    return () => {
      animation.cancel()
      optionAnimations.forEach((optionAnimation) => optionAnimation.cancel())
    }
  }, [open])

  function openOnHover() {
    if (hoverCloseTimeoutRef.current) {
      clearTimeout(hoverCloseTimeoutRef.current)
      hoverCloseTimeoutRef.current = null
    }
    if (userId && !loading) setOpen(true)
  }

  function closeAfterHover() {
    if (hoverCloseTimeoutRef.current) clearTimeout(hoverCloseTimeoutRef.current)
    hoverCloseTimeoutRef.current = setTimeout(() => setOpen(false), 180)
  }

  async function react(reactionType: ReactionType) {
    if (!userId || loading) return
    setLoading(true)
    setOpen(false)
    if (myReaction === reactionType) {
      await supabase.from(table).delete().eq(field, targetId).eq('user_id', userId)
      setCounts(prev => {
        const next = { ...prev }
        next[reactionType] = (next[reactionType] ?? 1) - 1
        if (next[reactionType] <= 0) delete next[reactionType]
        return next
      })
      setMyReaction(null)
    } else {
      await supabase.from(table).upsert(
        { [field]: targetId, user_id: userId, reaction_type: reactionType },
        { onConflict: `user_id,${field}` }
      )
      setCounts(prev => {
        const next = { ...prev }
        if (myReaction) {
          next[myReaction] = (next[myReaction] ?? 1) - 1
          if (next[myReaction] <= 0) delete next[myReaction]
        }
        next[reactionType] = (next[reactionType] ?? 0) + 1
        return next
      })
      setMyReaction(reactionType)
    }
    setLoading(false)
  }

  async function openPeople() {
    setOpen(false)
    setPeopleOpen(true)
    setPeopleLoading(true)
    setPeopleError(null)

    const { data: reactionRows, error: reactionsError } = await supabase
      .from(table)
      .select('user_id, reaction_type, created_at')
      .eq(field, targetId)
      .order('created_at', { ascending: false })

    if (reactionsError) {
      setPeopleError('Não foi possível carregar as reações.')
      setPeopleLoading(false)
      return
    }

    const rows = (reactionRows ?? []) as { user_id: string; reaction_type: ReactionType }[]
    const userIds = Array.from(new Set(rows.map((row) => row.user_id)))

    if (userIds.length === 0) {
      setReactionUsers([])
      setPeopleLoading(false)
      return
    }

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, avatar_url')
      .in('id', userIds)

    if (usersError) {
      setPeopleError('Não foi possível carregar as pessoas que reagiram.')
      setPeopleLoading(false)
      return
    }

    const userMap = new Map(
      (users ?? []).map((user) => [user.id, user as { id: string; name: string; avatar_url: string | null }])
    )

    setReactionUsers(rows.flatMap((row) => {
      const user = userMap.get(row.user_id)
      return user ? [{
        id: user.id,
        name: user.name,
        avatarUrl: user.avatar_url,
        reactionType: row.reaction_type,
      }] : []
    }))
    setPeopleLoading(false)
  }

  const reactionSummary = total > 0 ? (
    <button
      type="button"
      onClick={() => void openPeople()}
      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
      aria-label={`Ver ${total} ${total === 1 ? 'reação' : 'reações'}`}
    >
      <span className="flex gap-0.5">
        {topTypes.map((reactionType) => (
          <span key={reactionType} className="rounded-full bg-white ring-2 ring-white dark:bg-zinc-950 dark:ring-zinc-950">
            <ReactionIcon type={reactionType} size={17} />
          </span>
        ))}
      </span>
      <span className="tabular-nums">{total}</span>
    </button>
  ) : null

  return (
    <div
      ref={ref}
      className={`relative inline-flex items-center gap-2 ${variant === 'action' ? 'w-full sm:w-auto' : ''}`}
    >
      {userId && (
        <div
          ref={pickerRef}
          onMouseEnter={openOnHover}
          onMouseLeave={closeAfterHover}
          className={`absolute bottom-full left-0 z-50 mb-2 ${
            open
              ? 'pointer-events-auto'
              : 'pointer-events-none translate-y-4 opacity-0'
          }`}
        >
          <ReactionPicker myReaction={myReaction} onReact={react} />
        </div>
      )}

      <button
        onMouseEnter={openOnHover}
        onMouseLeave={closeAfterHover}
        onClick={() => {
          if (!userId) { router.push(`/login?redirect=${encodeURIComponent(pathname)}`); return }
          setOpen(o => !o)
        }}
        disabled={loading}
        title={!userId ? 'Faça login para reagir' : 'Reagir'}
        className={`flex items-center gap-2 rounded-full border font-medium transition select-none disabled:opacity-60 ${
          variant === 'action' ? 'flex-1 justify-center px-4 py-2 text-base sm:flex-none' : 'px-3 py-1.5 text-sm'
        } ${className} ${
          myReaction
            ? `border-zinc-200 bg-zinc-50 ${reactionData?.color}`
            : userId
            ? 'text-zinc-400 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-600'
            : 'text-zinc-300 border-zinc-100 hover:text-zinc-500 hover:border-zinc-300'
        }`}
      >
        {label && <span className="font-semibold text-zinc-900">{label}</span>}
        {myReaction ? (
          <ReactionIcon type={myReaction} size={17} />
        ) : (
          <svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
          </svg>
        )}
      </button>

      {summaryTargetId
        ? summaryTarget && reactionSummary && createPortal(reactionSummary, summaryTarget)
        : reactionSummary}

      {peopleOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-label="Pessoas que reagiram"
          onClick={() => setPeopleOpen(false)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Reações</h2>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {total} {total === 1 ? 'pessoa reagiu' : 'pessoas reagiram'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPeopleOpen(false)}
                className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                aria-label="Fechar"
              >
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto p-2">
              {peopleLoading ? (
                <p className="px-3 py-8 text-center text-sm text-zinc-400">Carregando reações...</p>
              ) : peopleError ? (
                <p className="px-3 py-8 text-center text-sm text-red-600">{peopleError}</p>
              ) : reactionUsers.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-zinc-400">Nenhuma reação encontrada.</p>
              ) : (
                reactionUsers.map((person) => {
                  const reaction = REACTIONS.find((item) => item.type === person.reactionType)
                  return (
                    <Link
                      key={person.id}
                      href={`/usuarios/${person.id}`}
                      onClick={() => setPeopleOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    >
                      <UserAvatar src={person.avatarUrl} name={person.name} className="h-10 w-10" sizes="40px" />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        {person.name}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${reaction?.color ?? 'text-zinc-500'}`}>
                        <ReactionIcon type={person.reactionType} size={16} />
                        {reaction?.label ?? 'Reagiu'}
                      </span>
                    </Link>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
