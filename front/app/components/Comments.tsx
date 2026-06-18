'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { getAuthUser } from '@/app/lib/auth'
import UserAvatar from '@/app/components/UserAvatar'
import UserMascotBadge, { type UserMascot } from '@/app/components/UserMascotBadge'
import UserHoverCard from '@/app/components/UserHoverCard'
import { REACTIONS, ReactionPicker, type ReactionType } from './LikeButton'
import MentionTextarea, { type MentionHandle } from './MentionTextarea'
import { parseMentions } from '@/app/lib/mentions'

type MascotInfo = { id: string; name: string; image_url: string; min_xp?: number | null }

type Comment = {
  id: string
  content: string
  created_at: string
  parent_id: string | null
  mascot_id: string | null
  sticker: { name: string; image_url: string } | null
  users: { id: string; name: string; avatar_url: string | null; selected_mascot: UserMascot } | null
}

type CommentWithReplies = Comment & { replies: Comment[] }

type Reaction = { comment_id: string; reaction_type: string; user_id: string }

type CommentType = 'project' | 'article' | 'event'

type Props = {
  type: CommentType
  targetId: string
}

const COMMENT_CONFIG: Record<CommentType, { table: string; field: string; reactionTable: string }> = {
  project: { table: 'project_comments', field: 'project_id', reactionTable: 'project_comment_reactions' },
  article: { table: 'article_comments', field: 'article_id', reactionTable: 'article_comment_reactions' },
  event: { table: 'event_comments', field: 'event_id', reactionTable: 'event_comment_reactions' },
}

function Avatar({ user }: { user: Comment['users'] }) {
  const content = user?.avatar_url ? (
    <Image src={user.avatar_url} alt={user.name} width={28} height={28} className="w-7 h-7 rounded-full object-cover shrink-0" />
  ) : (
    <UserAvatar name={user?.name} className="h-7 w-7" sizes="28px" />
  )

  if (user?.id) {
    return (
      <Link href={`/usuarios/${user.id}`} className="inline-flex rounded-full hover:opacity-80 transition" aria-label={`Ver perfil de ${user.name}`}>
        {content}
      </Link>
    )
  }

  return content
}

const COMMENT_MASCOT_BADGE_SIZE = 24

function UserName({ user }: { user: Comment['users'] }) {
  if (!user?.id) return <span className="text-sm font-semibold text-zinc-800">{user?.name}</span>
  return (
    <UserHoverCard userId={user.id}>
      <Link href={`/usuarios/${user.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-800 hover:text-[#2F9E41] transition">
        <span>{user.name}</span>
        <UserMascotBadge mascot={user.selected_mascot} size={COMMENT_MASCOT_BADGE_SIZE} />
      </Link>
    </UserHoverCard>
  )
}

const COMMENT_LIMIT = 280

function CommentText({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = content.length > COMMENT_LIMIT
  const displayed = isLong && !expanded ? content.slice(0, COMMENT_LIMIT).trimEnd() + '…' : content
  return (
    <p className="whitespace-pre-wrap break-words text-base leading-7 text-zinc-700">
      {parseMentions(displayed)}
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="ml-1 text-sm font-medium text-[#2F9E41] hover:opacity-70 transition"
        >
          {expanded ? 'Ler menos' : 'Ler mais'}
        </button>
      )}
    </p>
  )
}

const TZ = 'America/Sao_Paulo'

function formatDate(iso: string) {
  const date = new Date(iso)
  const fmt = (d: Date) => new Intl.DateTimeFormat('en', { timeZone: TZ, year: 'numeric' }).format(d)
  const isCurrentYear = fmt(date) === fmt(new Date())
  return date.toLocaleDateString('pt-BR', {
    timeZone: TZ,
    day: 'numeric',
    month: 'short',
    ...(isCurrentYear ? {} : { year: 'numeric' }),
  })
}

function ReactionIcon({ type, size = 16 }: { type: ReactionType; size?: number }) {
  const r = REACTIONS.find(r => r.type === type)!
  return (
    <span className={`inline-flex shrink-0 ${r.color}`} style={{ width: size, height: size }}>
      {r.icon}
    </span>
  )
}

function CommentReactionBar({
  commentId,
  userId,
  reactions,
  onReact,
}: {
  commentId: string
  userId: string | null
  reactions: Reaction[]
  onReact: (commentId: string, type: ReactionType) => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const myReaction = (userId
    ? reactions.find(r => r.comment_id === commentId && r.user_id === userId)?.reaction_type ?? null
    : null) as ReactionType | null

  const counts: Record<string, number> = {}
  reactions.filter(r => r.comment_id === commentId).forEach(r => {
    counts[r.reaction_type] = (counts[r.reaction_type] ?? 0) + 1
  })
  const total = Object.values(counts).reduce((a, c) => a + c, 0)
  const topTypes = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t as ReactionType)
  const reactionData = REACTIONS.find(r => r.type === myReaction)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div ref={ref} className="relative inline-flex">
      {open && userId && (
        <div className="absolute bottom-full left-0 mb-1.5 z-50">
          <ReactionPicker myReaction={myReaction} onReact={(t) => { onReact(commentId, t); setOpen(false) }} size="sm" />
        </div>
      )}

      <button
        onClick={() => {
          if (!userId) { router.push(`/login?redirect=${encodeURIComponent(pathname)}`); return }
          setOpen(o => !o)
        }}
        className={`flex items-center gap-1.5 text-xs rounded-full px-2 py-0.5 border transition select-none ${
          myReaction
            ? `border-transparent bg-zinc-50 ${reactionData?.color}`
            : 'text-zinc-400 border-zinc-200 hover:bg-zinc-50'
        }`}
      >
        {topTypes.length > 0 ? (
          <span className="flex -space-x-0.5">
            {topTypes.map(t => <ReactionIcon key={t} type={t} size={15} />)}
          </span>
        ) : myReaction ? (
          <ReactionIcon type={myReaction} size={15} />
        ) : (
          <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor"><path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 0 1 6 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V3a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23h-.777ZM2.331 10.977a11.969 11.969 0 0 0-.831 4.398 12 12 0 0 0 .52 3.507c.26.85 1.084 1.368 1.973 1.368H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 0 1-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227Z" /></svg>
        )}
        {total > 0 && <span>{total}</span>}
      </button>
    </div>
  )
}

export default function Comments({ type, targetId }: Props) {
  const { table, field, reactionTable } = COMMENT_CONFIG[type]

  const [threads, setThreads]     = useState<CommentWithReplies[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [ownedMascots, setOwnedMascots]     = useState<MascotInfo[]>([])
  const [selectedMascot, setSelectedMascot] = useState<MascotInfo | null>(null)
  const [replyMascot, setReplyMascot]       = useState<MascotInfo | null>(null)
  const [userId, setUserId]       = useState<string | null>(null)
  const [text, setText]             = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null)
  const [replyText, setReplyText]   = useState('')
  const [replySubmitting, setReplySubmitting] = useState(false)
  const mainRef  = useRef<MentionHandle>(null)
  const replyRef = useRef<MentionHandle>(null)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from(table)
      .select('id, content, created_at, parent_id, mascot_id, sticker:mascots(name, image_url), users(id, name, avatar_url, selected_mascot:mascots(name, image_url))')
      .eq(field, targetId)
      .order('created_at', { ascending: true })

    const all = (data as unknown as Comment[]) ?? []
    const roots = all.filter(c => !c.parent_id)
    const built: CommentWithReplies[] = roots.map(r => ({
      ...r,
      replies: all.filter(c => c.parent_id === r.id),
    }))
    setThreads(built)

    const ids = all.map(c => c.id)
    if (ids.length) {
      supabase.from(reactionTable).select('comment_id, reaction_type, user_id').in('comment_id', ids)
        .then(({ data: rdata }) => setReactions((rdata as Reaction[]) ?? []))
    }
  }, [field, reactionTable, table, targetId])

  useEffect(() => {
    void Promise.resolve().then(load)
    getAuthUser().then(async (user) => {
      if (!user) return
      setUserId(user.id)
      const { data: profile } = await supabase
        .from('users')
        .select('xp, selected_mascot_id')
        .eq('id', user.id)
        .single()
      const xp = profile?.xp ?? 0
      supabase.from('mascots').select('id, name, image_url, min_xp').eq('is_active', true).order('min_xp')
        .then(({ data: mascots }) => {
          if (!mascots) return
          setOwnedMascots(
            (mascots as MascotInfo[]).filter(
              (mascot) => mascot.id === profile?.selected_mascot_id || (mascot.min_xp ?? 0) <= xp
            )
          )
        })
    })
  }, [load])

  useEffect(() => {
    if (replyingTo) replyRef.current?.focus()
  }, [replyingTo])

  async function handleReact(commentId: string, reactionType: ReactionType) {
    if (!userId) return
    const existing = reactions.find(r => r.comment_id === commentId && r.user_id === userId)

    if (existing?.reaction_type === reactionType) {
      await supabase.from(reactionTable).delete().eq('comment_id', commentId).eq('user_id', userId)
      setReactions(prev => prev.filter(r => !(r.comment_id === commentId && r.user_id === userId)))
    } else {
      await supabase.from(reactionTable).upsert(
        { comment_id: commentId, user_id: userId, reaction_type: reactionType },
        { onConflict: 'comment_id,user_id' }
      )
      setReactions(prev => [
        ...prev.filter(r => !(r.comment_id === commentId && r.user_id === userId)),
        { comment_id: commentId, user_id: userId, reaction_type: reactionType },
      ])
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if ((!trimmed && !selectedMascot) || !userId) return
    setSubmitting(true)
    const { data, error } = await supabase
      .from(table)
      .insert({ [field]: targetId, user_id: userId, content: trimmed, parent_id: null, mascot_id: selectedMascot?.id ?? null })
      .select('id, content, created_at, parent_id, mascot_id, sticker:mascots(name, image_url), users(id, name, avatar_url, selected_mascot:mascots(name, image_url))')
      .single()
    if (!error && data) {
      setThreads(prev => [...prev, { ...(data as unknown as Comment), replies: [] }])
      setText('')
      setSelectedMascot(null)
    }
    setSubmitting(false)
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = replyText.trim()
    if ((!trimmed && !replyMascot) || !userId || !replyingTo) return
    setReplySubmitting(true)
    const { data, error } = await supabase
      .from(table)
      .insert({ [field]: targetId, user_id: userId, content: trimmed, parent_id: replyingTo.id, mascot_id: replyMascot?.id ?? null })
      .select('id, content, created_at, parent_id, mascot_id, sticker:mascots(name, image_url), users(id, name, avatar_url, selected_mascot:mascots(name, image_url))')
      .single()
    if (!error && data) {
      setThreads(prev => prev.map(t =>
        t.id === replyingTo.id ? { ...t, replies: [...t.replies, data as unknown as Comment] } : t
      ))
      setReplyText('')
      setReplyingTo(null)
      setReplyMascot(null)
    }
    setReplySubmitting(false)
  }

  async function handleDelete(id: string, parentId: string | null) {
    setDeletingId(id)
    await supabase.from(table).delete().eq('id', id)
    if (parentId) {
      setThreads(prev => prev.map(t =>
        t.id === parentId ? { ...t, replies: t.replies.filter(r => r.id !== id) } : t
      ))
    } else {
      setThreads(prev => prev.filter(t => t.id !== id))
    }
    setDeletingId(null)
  }

  const totalCount = threads.reduce((acc, t) => acc + 1 + t.replies.length, 0)

  return (
    <div className="mt-10 pt-8 border-t border-zinc-100">
      <h2 className="mb-6 text-xl font-semibold text-zinc-900">
        {totalCount > 0 ? `${totalCount} comentário${totalCount !== 1 ? 's' : ''}` : 'Comentários'}
      </h2>

      {threads.length > 0 && (
        <div className="flex flex-col gap-6 mb-8">
          {threads.map((comment) => (
            <div key={comment.id}>
              <div className="flex gap-3">
                <div className="shrink-0 mt-0.5"><Avatar user={comment.users} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <UserName user={comment.users} />
                    <span className="text-sm text-zinc-400">{formatDate(comment.created_at)}</span>
                  </div>
                  <CommentText content={comment.content} />
                  {comment.sticker && (
                    <div className="mt-2 inline-flex flex-col items-center gap-1">
                      <div className="rounded-2xl border border-[#2F9E41]/20 bg-[#2F9E41]/5 p-3">
                        <Image src={comment.sticker.image_url} alt={comment.sticker.name} width={96} height={96} className="h-24 w-24 object-contain drop-shadow-sm" />
                      </div>
                      <span className="text-[10px] font-semibold text-[#2F9E41]/70">{comment.sticker.name}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <CommentReactionBar commentId={comment.id} userId={userId} reactions={reactions} onReact={handleReact} />
                    {userId && (
                      <button
                        onClick={() => setReplyingTo(replyingTo?.id === comment.id ? null : { id: comment.id, name: comment.users?.name ?? '' })}
                        className="text-sm text-zinc-400 hover:text-zinc-700 transition"
                      >
                        Responder
                      </button>
                    )}
                    {userId === comment.users?.id && (
                      <button
                        onClick={() => handleDelete(comment.id, null)}
                        disabled={deletingId === comment.id}
                        className="text-sm text-zinc-300 hover:text-red-400 transition disabled:opacity-50"
                      >
                        {deletingId === comment.id ? 'Excluindo...' : 'Excluir'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {(comment.replies.length > 0 || replyingTo?.id === comment.id) && (
                <div className="ml-10 mt-3 flex flex-col gap-4 pl-4 border-l-2 border-zinc-100">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex gap-3">
                      <div className="shrink-0 mt-0.5"><Avatar user={reply.users} /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                          <UserName user={reply.users} />
                          <span className="text-sm text-zinc-400">{formatDate(reply.created_at)}</span>
                        </div>
                        <CommentText content={reply.content} />
                        {reply.sticker && (
                          <div className="mt-2 inline-flex flex-col items-center gap-1">
                            <div className="rounded-2xl border border-[#2F9E41]/20 bg-[#2F9E41]/5 p-3">
                              <Image src={reply.sticker.image_url} alt={reply.sticker.name} width={96} height={96} className="h-24 w-24 object-contain drop-shadow-sm" />
                            </div>
                            <span className="text-[10px] font-semibold text-[#2F9E41]/70">{reply.sticker.name}</span>
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <CommentReactionBar commentId={reply.id} userId={userId} reactions={reactions} onReact={handleReact} />
                          {userId === reply.users?.id && (
                            <button
                              onClick={() => handleDelete(reply.id, comment.id)}
                              disabled={deletingId === reply.id}
                              className="text-sm text-zinc-300 hover:text-red-400 transition disabled:opacity-50"
                            >
                              {deletingId === reply.id ? 'Excluindo...' : 'Excluir'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {replyingTo?.id === comment.id && (
                    <form onSubmit={handleReply} className="flex gap-3 items-start">
                      <div className="shrink-0 w-7" />
                      <div className="flex-1 flex flex-col gap-2">
                        <div className="rounded-xl border border-zinc-200 overflow-hidden focus-within:border-zinc-400 transition">
                          <MentionTextarea
                            ref={replyRef}
                            rows={2}
                            value={replyText}
                            onChange={setReplyText}
                            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void handleReply(e as unknown as React.FormEvent) } }}
                            placeholder={`Responder ${replyingTo.name}...`}
                            className="w-full resize-none px-3 py-2 text-base text-zinc-900 outline-none"
                          />
                          {ownedMascots.length > 0 && (
                            <div className="flex flex-wrap gap-1 border-t border-zinc-100 px-2 py-1.5">
                              {ownedMascots.map((m) => (
                                <button
                                  key={m.id}
                                  type="button"
                                  title={m.name}
                                  onClick={() => setReplyMascot(prev => prev?.id === m.id ? null : m)}
                                  className={`rounded-lg p-1 transition hover:bg-zinc-100 ${replyMascot?.id === m.id ? 'bg-[#2F9E41]/10 ring-2 ring-[#2F9E41]/40' : ''}`}
                                >
                                  <Image src={m.image_url} alt={m.name} width={36} height={36} className="h-9 w-9 object-contain" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => { setReplyingTo(null); setReplyText(''); setReplyMascot(null) }} className="px-3 py-1.5 text-sm text-zinc-500 transition hover:text-zinc-800">
                            Cancelar
                          </button>
                          <button type="submit" disabled={replySubmitting || (!replyText.trim() && !replyMascot)} className="rounded-lg bg-[#2F9E41] px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50">
                            {replySubmitting ? 'Enviando...' : 'Responder'}
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {userId ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div className="rounded-xl border border-zinc-200 overflow-hidden focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-100 transition">
            <MentionTextarea
              ref={mainRef}
              rows={3}
              value={text}
              onChange={setText}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void handleSubmit(e as unknown as React.FormEvent) } }}
              placeholder="Escreva um comentário..."
              className="w-full resize-none px-4 py-3 text-base text-zinc-900 outline-none"
            />
            {ownedMascots.length > 0 && (
              <div className="flex flex-wrap gap-1 border-t border-zinc-100 px-3 py-2">
                {ownedMascots.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    title={m.name}
                    onClick={() => setSelectedMascot(prev => prev?.id === m.id ? null : m)}
                    className={`rounded-lg p-1 transition hover:bg-zinc-100 ${selectedMascot?.id === m.id ? 'bg-[#2F9E41]/10 ring-2 ring-[#2F9E41]/40' : ''}`}
                  >
                    <Image src={m.image_url} alt={m.name} width={40} height={40} className="h-10 w-10 object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={submitting || (!text.trim() && !selectedMascot)} className="rounded-lg bg-[#2F9E41] px-4 py-2 text-base font-medium text-white transition hover:opacity-90 disabled:opacity-50">
              {submitting ? 'Enviando...' : 'Comentar'}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-base text-zinc-400">
          <a href="/login" className="text-zinc-600 underline hover:text-zinc-900 transition">Faça login</a> para comentar.
        </p>
      )}
    </div>
  )
}
