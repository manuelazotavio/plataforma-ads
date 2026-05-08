'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'

type Author = { name: string; avatar_url: string | null }
type Category = { id: string; name: string }
type Attachment = { type: 'image' | 'video'; url: string }

type Topic = {
  id: string
  title: string
  content: string
  created_at: string
  replies_count: number
  views_count: number
  user_id: string
  attachments: Attachment[] | null
  users: Author | null
  forum_categories: Category | null
}

type Reply = {
  id: string
  content: string
  created_at: string
  parent_id: string | null
  user_id: string
  users: Author | null
}

type ReplyNode = { reply: Reply; children: ReplyNode[] }
type VoteMap = Record<string, string[]>

const MODERATOR_REMOVED_REPLY = 'Esta resposta foi removida por um moderador.'
const AUTHOR_REMOVED_REPLY = 'Esta resposta foi removida pelo autor.'

function isRemovedReply(content: string) {
  return content === MODERATOR_REMOVED_REPLY || content === AUTHOR_REMOVED_REPLY
}

function buildTree(replies: Reply[]): ReplyNode[] {
  const map = new Map<string, ReplyNode>()
  for (const r of replies) map.set(r.id, { reply: r, children: [] })
  const roots: ReplyNode[] = []
  for (const r of replies) {
    const node = map.get(r.id)!
    if (r.parent_id && map.has(r.parent_id)) map.get(r.parent_id)!.children.push(node)
    else roots.push(node)
  }
  return roots
}

function getEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
  return null
}

function Avatar({ author, size = 32 }: { author: Author | null; size?: number }) {
  if (author?.avatar_url) {
    return (
      <div className="relative rounded-full overflow-hidden bg-zinc-100 shrink-0" style={{ width: size, height: size }}>
        <Image src={author.avatar_url} alt={author.name} fill className="object-cover" />
      </div>
    )
  }
  return (
    <div className="rounded-full bg-zinc-100 flex items-center justify-center shrink-0 text-xs font-semibold text-zinc-400" style={{ width: size, height: size }}>
      {author?.name?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

function UpvoteButton({ count, voted, onToggle, disabled }: { count: number; voted: boolean; onToggle: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`flex items-center gap-1 text-xs font-semibold transition-colors disabled:opacity-40 cursor-pointer ${voted ? 'text-[#2F9E41]' : 'text-zinc-400 hover:text-zinc-700'}`}
    >
      <svg width={13} height={13} viewBox="0 0 24 24" fill={voted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
      {count}
    </button>
  )
}

function ReplyForm({ onSubmit, onCancel, placeholder = 'Escreva sua resposta...' }: {
  onSubmit: (content: string) => Promise<void>
  onCancel?: () => void
  placeholder?: string
}) {
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handle(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    await onSubmit(content.trim())
    setContent('')
    setSubmitting(false)
  }

  return (
    <form onSubmit={handle} className="flex flex-col gap-2 mt-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        autoFocus
        required
        className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 transition w-full resize-none"
        placeholder={placeholder}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="rounded-xl px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 transition hover:opacity-90"
          style={{ backgroundColor: '#2F9E41' }}
        >
          {submitting ? 'Enviando...' : 'Responder'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-700 transition">
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}

function ReplyItem({ reply, depth, currentUserId, canModerate, voteMap, onVote, onReply, onDelete, replyingToId }: {
  reply: Reply
  depth: number
  currentUserId: string | null
  canModerate: boolean
  voteMap: VoteMap
  onVote: (id: string) => void
  onReply: (id: string | null) => void
  onDelete: (id: string) => void
  replyingToId: string | null
}) {
  const votes = voteMap[reply.id] ?? []
  const voted = !!currentUserId && votes.includes(currentUserId)
  const isOwn = currentUserId === reply.user_id
  const removed = isRemovedReply(reply.content)
  const isReplying = replyingToId === reply.id
  const date = new Date(reply.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
  const avatarSize = depth === 0 ? 32 : 26

  return (
    <div className="group py-4">
      <div className="flex items-start gap-3">
        <Link href={`/usuarios/${reply.user_id}`} className="rounded-full hover:opacity-80 transition">
          <Avatar author={reply.users} size={avatarSize} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/usuarios/${reply.user_id}`} className="text-sm font-semibold text-zinc-800 hover:text-[#2F9E41] transition">
              {reply.users?.name ?? 'Anonimo'}
            </Link>
            <span className="text-xs text-zinc-400">{date}</span>
          </div>
          <p className={`text-sm leading-relaxed whitespace-pre-wrap ${removed ? 'italic text-zinc-400' : 'text-zinc-700'}`}>{reply.content}</p>
          {!removed && (
            <div className="flex items-center gap-4 mt-2">
              <UpvoteButton count={votes.length} voted={voted} onToggle={() => onVote(reply.id)} disabled={!currentUserId} />
              {currentUserId && (
                <button
                  onClick={() => onReply(isReplying ? null : reply.id)}
                  className="text-xs font-semibold text-zinc-400 hover:text-zinc-700 transition cursor-pointer"
                >
                  {isReplying ? 'Cancelar' : 'Responder'}
                </button>
              )}
              {(isOwn || canModerate) && (
                <button
                  onClick={() => onDelete(reply.id)}
                  className="text-xs font-semibold text-zinc-300 hover:text-red-500 transition cursor-pointer opacity-0 group-hover:opacity-100"
                >
                  {canModerate && !isOwn ? 'Remover' : 'Excluir'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

export default function ForumTopicPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [topic, setTopic] = useState<Topic | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [voteMap, setVoteMap] = useState<VoteMap>({})
  const [topicVoters, setTopicVoters] = useState<string[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Reply | null>(null)
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null)
  const [moderationError, setModerationError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [{ data: topicData }, { data: { user } }] = await Promise.all([
      supabase
        .from('forum_topics')
        .select('id, title, content, created_at, replies_count, views_count, user_id, attachments, users(name, avatar_url), forum_categories(id, name)')
        .eq('id', id)
        .single(),
      supabase.auth.getUser(),
    ])

    if (!topicData) { router.push('/forum'); return }

    setTopic(topicData as unknown as Topic)
    setCurrentUserId(user?.id ?? null)
    if (user?.id) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      setCurrentUserRole(profile?.role ?? null)
    } else {
      setCurrentUserRole(null)
    }

    await supabase.from('forum_topics').update({ views_count: (topicData.views_count ?? 0) + 1 }).eq('id', id)

    const { data: repliesData } = await supabase
      .from('forum_replies')
      .select('id, content, created_at, parent_id, user_id, users(name, avatar_url)')
      .eq('topic_id', id)
      .order('created_at', { ascending: true })

    const loadedReplies = (repliesData as unknown as Reply[]) ?? []
    setReplies(loadedReplies)

    if (loadedReplies.length > 0) {
      const { data: replyVotes } = await supabase
        .from('forum_reply_votes')
        .select('reply_id, user_id')
        .in('reply_id', loadedReplies.map(r => r.id))

      const map: VoteMap = {}
      for (const v of replyVotes ?? []) {
        if (!map[v.reply_id]) map[v.reply_id] = []
        map[v.reply_id].push(v.user_id)
      }
      setVoteMap(map)
    }

    const { data: topicVotes } = await supabase
      .from('forum_topic_votes')
      .select('user_id')
      .eq('topic_id', id)

    setTopicVoters((topicVotes ?? []).map(v => v.user_id))
    setLoading(false)
  }, [id, router])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  async function handleTopicVote() {
    if (!currentUserId) return
    const voted = topicVoters.includes(currentUserId)
    if (voted) {
      await supabase.from('forum_topic_votes').delete().eq('topic_id', id).eq('user_id', currentUserId)
      setTopicVoters(prev => prev.filter(uid => uid !== currentUserId))
    } else {
      await supabase.from('forum_topic_votes').insert({ topic_id: id, user_id: currentUserId })
      setTopicVoters(prev => [...prev, currentUserId])
    }
  }

  async function handleReplyVote(replyId: string) {
    if (!currentUserId) return
    const reply = replies.find(r => r.id === replyId)
    if (!reply || isRemovedReply(reply.content)) return
    const voted = (voteMap[replyId] ?? []).includes(currentUserId)
    if (voted) {
      await supabase.from('forum_reply_votes').delete().eq('reply_id', replyId).eq('user_id', currentUserId)
      setVoteMap(prev => ({ ...prev, [replyId]: (prev[replyId] ?? []).filter(uid => uid !== currentUserId) }))
    } else {
      await supabase.from('forum_reply_votes').insert({ reply_id: replyId, user_id: currentUserId })
      setVoteMap(prev => ({ ...prev, [replyId]: [...(prev[replyId] ?? []), currentUserId] }))
    }
  }

  async function handleReply(content: string, parentId: string | null) {
    if (!currentUserId) return
    if (parentId && replies.some(r => r.id === parentId && isRemovedReply(r.content))) return
    const { data } = await supabase
      .from('forum_replies')
      .insert({ topic_id: id, user_id: currentUserId, content, parent_id: parentId })
      .select('id, content, created_at, parent_id, user_id, users(name, avatar_url)')
      .single()

    if (data) {
      setReplies(prev => [...prev, data as unknown as Reply])
      if (!parentId) {
        setTopic(prev => prev ? { ...prev, replies_count: (prev.replies_count ?? 0) + 1 } : prev)
        await supabase.from('forum_topics').update({ replies_count: (topic?.replies_count ?? 0) + 1 }).eq('id', id)
      }
      setReplyingToId(null)
    }
  }

  async function handleDelete(replyId: string) {
    const reply = replies.find(r => r.id === replyId)
    if (!reply || !currentUserId) return

    const canModerate = currentUserRole === 'admin' || currentUserRole === 'moderador'
    const isOwn = reply.user_id === currentUserId
    if (!isOwn && !canModerate) return

    setModerationError(null)
    setPendingDelete(reply)
  }

  async function confirmDelete() {
    if (!pendingDelete || !currentUserId) return

    const canModerate = currentUserRole === 'admin' || currentUserRole === 'moderador'
    const isOwn = pendingDelete.user_id === currentUserId
    if (!isOwn && !canModerate) return

    const content = canModerate && !isOwn ? MODERATOR_REMOVED_REPLY : AUTHOR_REMOVED_REPLY
    setDeletingReplyId(pendingDelete.id)

    const { error } = await supabase
      .from('forum_replies')
      .update({ content })
      .eq('id', pendingDelete.id)

    if (error) {
      setModerationError('Nao foi possivel remover esta resposta. Verifique as permissoes de moderacao no banco.')
      setDeletingReplyId(null)
      return
    }

    await supabase.from('forum_reply_votes').delete().eq('reply_id', pendingDelete.id)
    setReplies(prev => prev.map(r => r.id === pendingDelete.id ? { ...r, content } : r))
    setVoteMap(prev => {
      const next = { ...prev }
      delete next[pendingDelete.id]
      return next
    })
    if (replyingToId === pendingDelete.id) setReplyingToId(null)
    setPendingDelete(null)
    setDeletingReplyId(null)
  }

  function renderTree(nodes: ReplyNode[], depth = 0): React.ReactNode {
    return nodes.map(node => {
      const visualDepth = Math.min(depth, 5)
      return (
        <div key={node.reply.id} className={depth > 0 ? `pl-4 ${visualDepth > 0 ? 'border-l border-zinc-100' : ''}` : ''}>
          <ReplyItem
            reply={node.reply}
            depth={depth}
            currentUserId={currentUserId}
            canModerate={currentUserRole === 'admin' || currentUserRole === 'moderador'}
            voteMap={voteMap}
            onVote={handleReplyVote}
            onReply={setReplyingToId}
            onDelete={handleDelete}
            replyingToId={replyingToId}
          />
          {replyingToId === node.reply.id && !isRemovedReply(node.reply.content) && (
            <div className="pl-10 pb-2">
              <ReplyForm
                onSubmit={(content) => handleReply(content, node.reply.id)}
                onCancel={() => setReplyingToId(null)}
                placeholder={`Respondendo a ${node.reply.users?.name ?? 'Anonimo'}...`}
              />
            </div>
          )}
          {node.children.length > 0 && (
            <div className="ml-4">
              {renderTree(node.children, depth + 1)}
            </div>
          )}
        </div>
      )
    })
  }

  if (loading) {
    return (
      <div className="px-4 md:px-10 py-8 max-w-3xl mx-auto w-full animate-pulse space-y-4">
        <div className="h-4 w-32 bg-zinc-100 rounded" />
        <div className="h-8 w-3/4 bg-zinc-100 rounded" />
        <div className="h-4 w-48 bg-zinc-100 rounded" />
      </div>
    )
  }

  if (!topic) return null

  const topicVoted = !!currentUserId && topicVoters.includes(currentUserId)
  const tree = buildTree(replies)
  const topLevelCount = replies.filter(r => !r.parent_id && !isRemovedReply(r.content)).length
  const cat = topic.forum_categories
  const attachments = topic.attachments ?? []
  const topicDate = new Date(topic.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="px-4 md:px-10 py-8 max-w-3xl mx-auto w-full">
      <Link href="/forum" className="text-sm text-zinc-400 hover:text-zinc-700 transition mb-8 inline-flex items-center gap-1.5">
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
        F&oacute;rum
      </Link>

    
      <div className="mb-8">
        {cat && (
          <span className="text-sm font-semibold text-[#2F9E41] mb-3 inline-block">
            {cat.name}
          </span>
        )}
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-black text-zinc-900 leading-tight mb-4">{topic.title}</h1>
            <div className="flex items-center gap-3">
              <Link href={`/usuarios/${topic.user_id}`} className="rounded-full hover:opacity-80 transition">
                <Avatar author={topic.users} size={32} />
              </Link>
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Link href={`/usuarios/${topic.user_id}`} className="font-medium text-zinc-600 hover:text-[#2F9E41] transition">
                  {topic.users?.name ?? 'Anonimo'}
                </Link>
                <span>&bull;</span>
                <span>{topicDate}</span>
                <span>&bull;</span>
                <span>{topic.replies_count ?? 0} respostas</span>
                <span>&bull;</span>
                <span>{(topic.views_count ?? 0) + 1} views</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
            <UpvoteButton count={topicVoters.length} voted={topicVoted} onToggle={handleTopicVote} disabled={!currentUserId} />
            <span className="text-xs text-zinc-400">votos</span>
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-100 pt-8">
        <p className="text-base text-zinc-800 leading-relaxed whitespace-pre-wrap">{topic.content}</p>

      
        {attachments.length > 0 && (
          <div className="flex flex-col gap-4 mt-6">
            {attachments.map((att, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-zinc-100 bg-zinc-50">
                {att.type === 'image' ? (
                  <Image
                    src={att.url}
                    alt=""
                    width={800}
                    height={500}
                    className="w-full h-auto object-contain max-h-125"
                  />
                ) : (() => {
                  const embed = getEmbedUrl(att.url)
                  return embed
                    ? <iframe src={embed} className="w-full aspect-video" allowFullScreen />
                    : <video src={att.url} controls className="w-full aspect-video" />
                })()}
              </div>
            ))}
          </div>
        )}
      </div>

   
      <div className="border-t border-zinc-100 pt-8 mt-10">
        <h2 className="text-xs font-semibold text-zinc-400 mb-4">
          {topLevelCount} {topLevelCount === 1 ? 'Resposta' : 'Respostas'}
        </h2>

        {tree.length > 0 && (
          <div className="divide-y divide-zinc-100">
            {renderTree(tree)}
          </div>
        )}

        
        <div className="mt-8 pt-8 border-t border-zinc-100">
          {currentUserId ? (
            <div className="flex flex-col gap-3">
              <label className="text-sm font-semibold text-zinc-700">Sua resposta</label>
              <ReplyForm
                onSubmit={(content) => handleReply(content, null)}
                placeholder="Escreva sua resposta..."
              />
            </div>
          ) : (
            <p className="text-sm text-zinc-400">
              <Link href="/login" className="text-[#2F9E41] font-medium hover:opacity-70">Fa&ccedil;a login</Link> para responder.
            </p>
          )}
        </div>
      </div>

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-500">
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-zinc-900">
              {pendingDelete.user_id === currentUserId ? 'Excluir resposta?' : 'Remover resposta?'}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              {pendingDelete.user_id === currentUserId
                ? 'A resposta sera substituida por uma mensagem indicando que ela foi removida pelo autor.'
                : 'A resposta sera substituida por uma mensagem indicando que foi removida por um moderador.'}
            </p>
            {moderationError && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                {moderationError}
              </p>
            )}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPendingDelete(null)
                  setModerationError(null)
                }}
                disabled={deletingReplyId === pendingDelete.id}
                className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deletingReplyId === pendingDelete.id}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                {deletingReplyId === pendingDelete.id ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
