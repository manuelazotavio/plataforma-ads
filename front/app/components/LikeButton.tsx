'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { getAuthUser } from '@/app/lib/auth'

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
  return (
    <div className="no-scrollbar flex items-end gap-0.5 overflow-x-auto overscroll-x-contain bg-white rounded-2xl shadow-xl border border-zinc-100 px-2 py-2 max-w-[calc(100vw-2rem)]">
      {REACTIONS.map((r) => (
        <button
          key={r.type}
          onClick={() => onReact(r.type)}
          title={r.label}
          className={`flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-transform duration-150 hover:scale-125 hover:bg-zinc-50 ${
            myReaction === r.type ? 'scale-110 bg-zinc-50' : ''
          }`}
        >
          <ReactionIcon type={r.type} size={iconSize} />
          <span className="text-[9px] text-zinc-400 leading-none font-medium whitespace-nowrap">{r.label}</span>
        </button>
      ))}
    </div>
  )
}

type Props = {
  type: 'project' | 'article'
  targetId: string
  initialCount: number
  label?: string
  variant?: 'default' | 'action'
  className?: string
}

export default function LikeButton({ type, targetId, initialCount, label, variant = 'default', className = '' }: Props) {
  const table = type === 'project' ? 'project_likes' : 'article_likes'
  const field = type === 'project' ? 'project_id' : 'article_id'

  const [userId, setUserId]         = useState<string | null>(null)
  const [myReaction, setMyReaction] = useState<ReactionType | null>(null)
  const [counts, setCounts]         = useState<Record<string, number>>({})
  const [open, setOpen]             = useState(false)
  const [loading, setLoading]       = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const total = Object.values(counts).reduce((a, c) => a + c, 0) || initialCount
  const topTypes = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t as ReactionType)
  const reactionData = REACTIONS.find(r => r.type === myReaction)

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

  return (
    <div ref={ref} className={`relative inline-flex ${variant === 'action' ? 'w-full sm:w-auto' : ''}`}>
      {open && userId && (
        <div className="absolute bottom-full left-1/2 mb-2 z-50 -translate-x-1/2">
          <ReactionPicker myReaction={myReaction} onReact={react} />
        </div>
      )}

      <button
        onClick={() => userId ? setOpen(o => !o) : undefined}
        disabled={loading}
        title={!userId ? 'Faça login para reagir' : 'Reagir'}
        className={`flex items-center gap-2 rounded-full border font-medium transition select-none disabled:opacity-60 ${
          variant === 'action' ? 'px-4 py-2 text-base' : 'px-3 py-1.5 text-sm'
        } ${className} ${
          myReaction
            ? `border-zinc-200 bg-zinc-50 ${reactionData?.color}`
            : userId
            ? 'text-zinc-400 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-600'
            : 'text-zinc-300 border-zinc-100 cursor-default'
        }`}
      >
        {label && <span className="font-semibold text-zinc-900">{label}</span>}
        {topTypes.length > 0 ? (
          <span className="flex -space-x-1">
            {topTypes.map(t => <ReactionIcon key={t} type={t} size={17} />)}
          </span>
        ) : myReaction ? (
          <ReactionIcon type={myReaction} size={17} />
        ) : (
          <svg width={17} height={17} viewBox="0 0 24 24" fill="currentColor"><path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 0 1 6 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V3a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23h-.777ZM2.331 10.977a11.969 11.969 0 0 0-.831 4.398 12 12 0 0 0 .52 3.507c.26.85 1.084 1.368 1.973 1.368H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 0 1-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227Z" /></svg>
        )}
        {total > 0 && <span className="text-xs">{total}</span>}
      </button>
    </div>
  )
}
