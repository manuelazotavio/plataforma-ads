'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { REACTIONS, ReactionPicker, type ReactionType } from './LikeButton'

type Comment = {
  id: string
  content: string
  created_at: string
  parent_id: string | null
  users: { id: string; name: string; avatar_url: string | null } | null
}

type CommentWithReplies = Comment & { replies: Comment[] }

type Reaction = { comment_id: string; reaction_type: string; user_id: string }

type Props = {
  type: 'project' | 'article'
  targetId: string
}

function Avatar({ user }: { user: Comment['users'] }) {
  const content = user?.avatar_url ? (
    <Image src={user.avatar_url} alt={user.name} width={28} height={28} className="w-7 h-7 rounded-full object-cover shrink-0" />
  ) : (
    <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-medium text-zinc-500 shrink-0">
      {user?.name?.charAt(0).toUpperCase()}
    </div>
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

function UserName({ user }: { user: Comment['users'] }) {
  if (!user?.id) return <span className="text-xs font-semibold text-zinc-800">{user?.name}</span>
  return (
    <Link href={`/usuarios/${user.id}`} className="text-xs font-semibold text-zinc-800 hover:text-[#2F9E41] transition">
      {user.name}
    </Link>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
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
        onClick={() => userId ? setOpen(o => !o) : undefined}
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
  const table = type === 'project' ? 'project_comments' : 'article_comments'
  const field = type === 'project' ? 'project_id' : 'article_id'
  const reactionTable = type === 'project' ? 'project_comment_reactions' : 'article_comment_reactions'

  const [threads, setThreads]       = useState<CommentWithReplies[]>([])
  const [reactions, setReactions]   = useState<Reaction[]>([])
  const [userId, setUserId]         = useState<string | null>(null)
  const [text, setText]             = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null)
  const [replyText, setReplyText]   = useState('')
  const [replySubmitting, setReplySubmitting] = useState(false)
  const mainRef  = useRef<HTMLTextAreaElement>(null)
  const replyRef = useRef<HTMLTextAreaElement>(null)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from(table)
      .select('id, content, created_at, parent_id, users(id, name, avatar_url)')
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
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
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
    if (!trimmed || !userId) return
    setSubmitting(true)
    const { data, error } = await supabase
      .from(table)
      .insert({ [field]: targetId, user_id: userId, content: trimmed, parent_id: null })
      .select('id, content, created_at, parent_id, users(id, name, avatar_url)')
      .single()
    if (!error && data) {
      setThreads(prev => [...prev, { ...(data as unknown as Comment), replies: [] }])
      setText('')
    }
    setSubmitting(false)
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = replyText.trim()
    if (!trimmed || !userId || !replyingTo) return
    setReplySubmitting(true)
    const { data, error } = await supabase
      .from(table)
      .insert({ [field]: targetId, user_id: userId, content: trimmed, parent_id: replyingTo.id })
      .select('id, content, created_at, parent_id, users(id, name, avatar_url)')
      .single()
    if (!error && data) {
      setThreads(prev => prev.map(t =>
        t.id === replyingTo.id ? { ...t, replies: [...t.replies, data as unknown as Comment] } : t
      ))
      setReplyText('')
      setReplyingTo(null)
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
      <h2 className="text-sm font-semibold text-zinc-900 mb-6">
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
                    <span className="text-xs text-zinc-400">{formatDate(comment.created_at)}</span>
                  </div>
                  <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <CommentReactionBar commentId={comment.id} userId={userId} reactions={reactions} onReact={handleReact} />
                    {userId && (
                      <button
                        onClick={() => setReplyingTo(replyingTo?.id === comment.id ? null : { id: comment.id, name: comment.users?.name ?? '' })}
                        className="text-xs text-zinc-400 hover:text-zinc-700 transition"
                      >
                        Responder
                      </button>
                    )}
                    {userId === comment.users?.id && (
                      <button
                        onClick={() => handleDelete(comment.id, null)}
                        disabled={deletingId === comment.id}
                        className="text-xs text-zinc-300 hover:text-red-400 transition disabled:opacity-50"
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
                          <span className="text-xs text-zinc-400">{formatDate(reply.created_at)}</span>
                        </div>
                        <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">{reply.content}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <CommentReactionBar commentId={reply.id} userId={userId} reactions={reactions} onReact={handleReact} />
                          {userId === reply.users?.id && (
                            <button
                              onClick={() => handleDelete(reply.id, comment.id)}
                              disabled={deletingId === reply.id}
                              className="text-xs text-zinc-300 hover:text-red-400 transition disabled:opacity-50"
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
                        <textarea
                          ref={replyRef}
                          rows={2}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleReply(e) }}
                          placeholder={`Responder ${replyingTo.name}...`}
                          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 transition resize-none"
                        />
                        <div className="flex gap-2 justify-end">
                          <button type="button" onClick={() => { setReplyingTo(null); setReplyText('') }} className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-800 transition">
                            Cancelar
                          </button>
                          <button type="submit" disabled={replySubmitting || !replyText.trim()} className="rounded-lg bg-[#2F9E41] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 transition">
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
          <textarea
            ref={mainRef}
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(e) }}
            placeholder="Escreva um comentário..."
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition resize-none"
          />
          <div className="flex justify-end">
            <button type="submit" disabled={submitting || !text.trim()} className="rounded-lg bg-[#2F9E41] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition">
              {submitting ? 'Enviando...' : 'Comentar'}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-zinc-400">
          <a href="/login" className="text-zinc-600 underline hover:text-zinc-900 transition">Faça login</a> para comentar.
        </p>
      )}
    </div>
  )
}
