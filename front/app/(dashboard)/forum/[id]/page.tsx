'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'
import { getAuthUser } from '@/app/lib/auth'
import UserAvatar from '@/app/components/UserAvatar'
import { formatFileSize } from '@/app/lib/files'
import MentionTextarea from '@/app/components/MentionTextarea'
import { parseMentions } from '@/app/lib/mentions'

type Author = { name: string; avatar_url: string | null }
type Voter = Author & { id: string }
type Category = { id: string; name: string }
type Attachment = { type: 'image' | 'video' | 'file'; url: string; name?: string; size?: number }

type Topic = {
  id: string
  title: string
  content: string
  created_at: string
  replies_count: number
  views_count: number
  user_id: string
  is_closed: boolean
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
  attachments: Attachment[] | null
  users: Author | null
}

type ReplyNode = { reply: Reply; children: ReplyNode[] }
type VoteMap = Record<string, Voter[]>

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
    <UserAvatar name={author?.name} className="" sizes={`${size}px`} style={{ width: size, height: size }} />
  )
}

function UpvoteButton({ voters, voted, onToggle, disabled }: {
  voters: Voter[]
  voted: boolean
  onToggle: () => void
  disabled: boolean
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      title={disabled ? 'Faça login para votar' : voted ? 'Remover voto' : 'Votar'}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-all disabled:opacity-40 cursor-pointer ${
        voted
          ? 'border-[#2F9E41] bg-[#2F9E41]/10 text-[#2F9E41]'
          : 'border-zinc-200 bg-zinc-50 text-zinc-500 hover:border-[#2F9E41] hover:text-[#2F9E41]'
      }`}
    >
      <svg width={18} height={18} viewBox="0 0 24 24" fill={voted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
      <span className="text-sm font-bold leading-none">{voters.length} votos</span>
    </button>
  )
}

function VotersModal({ title, voters, onClose }: { title: string; voters: Voter[]; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voters-title"
      onClick={onClose}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="voters-title" className="text-base font-semibold text-zinc-900">{title}</h2>
            <p className="mt-1 text-xs text-zinc-400">
              {voters.length} {voters.length === 1 ? 'pessoa votou' : 'pessoas votaram'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-4 max-h-80 space-y-1 overflow-y-auto">
          {voters.map((voter) => (
            <Link
              key={voter.id}
              href={`/usuarios/${voter.id}`}
              onClick={onClose}
              className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-zinc-50"
            >
              <Avatar author={voter} size={36} />
              <span className="min-w-0 truncate text-sm font-medium text-zinc-700">{voter.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function ReplyForm({ onSubmit, onCancel, placeholder = 'Escreva sua resposta...' }: {
  onSubmit: (content: string, attachments: Attachment[]) => Promise<void>
  onCancel?: () => void
  placeholder?: string
}) {
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function uploadFiles(files: File[]) {
    if (!files.length) return
    setUploading(true)
    const user = await getAuthUser()
    if (!user) { setUploading(false); return }
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `forum/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('forum-media').upload(path, file)
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('forum-media').getPublicUrl(path)
        setAttachments(prev => [...prev, { type: 'image', url: publicUrl, name: file.name, size: file.size }])
      }
    }
    setUploading(false)
  }

  async function handle(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() && attachments.length === 0) return
    setSubmitting(true)
    await onSubmit(content.trim(), attachments)
    setContent('')
    setAttachments([])
    setSubmitting(false)
  }

  return (
    <form onSubmit={handle} className="flex flex-col gap-2 mt-3">
      <MentionTextarea
        value={content}
        onChange={setContent}
        rows={3}
        className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 transition w-full resize-none"
        placeholder={placeholder}
      />

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((att, i) => (
            <div key={i} className="relative group h-20 w-20 rounded-lg overflow-hidden border border-zinc-200 bg-zinc-50">
              <Image src={att.url} alt="" fill className="object-cover" />
              <button
                type="button"
                onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition text-white text-lg"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50 disabled:opacity-50 transition"
        >
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x={3} y={3} width={18} height={18} rx={2}/><circle cx={8.5} cy={8.5} r={1.5}/><polyline points="21 15 16 10 5 21"/>
          </svg>
          {uploading ? 'Enviando...' : 'Foto'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => { void uploadFiles(Array.from(e.target.files ?? [])); e.target.value = '' }}
        />
        <div className="flex gap-2 ml-auto">
          {onCancel && (
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-700 transition">
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={submitting || uploading || (!content.trim() && attachments.length === 0)}
            className="rounded-xl px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 transition hover:opacity-90"
            style={{ backgroundColor: '#2F9E41' }}
          >
            {submitting ? 'Enviando...' : 'Responder'}
          </button>
        </div>
      </div>
    </form>
  )
}

function ReplyItem({ reply, depth, currentUserId, canModerate, isClosed, voteMap, onVote, onShowVoters, onReply, onDelete, replyingToId }: {
  reply: Reply
  depth: number
  currentUserId: string | null
  canModerate: boolean
  isClosed: boolean
  voteMap: VoteMap
  onVote: (id: string) => void
  onShowVoters: (title: string, voters: Voter[]) => void
  onReply: (id: string | null) => void
  onDelete: (id: string) => void
  replyingToId: string | null
}) {
  const votes = voteMap[reply.id] ?? []
  const voted = !!currentUserId && votes.some(voter => voter.id === currentUserId)
  const isOwn = currentUserId === reply.user_id
  const removed = isRemovedReply(reply.content)
  const isReplying = replyingToId === reply.id
  const replyDateObj = new Date(reply.created_at)
  const date = replyDateObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', ...(replyDateObj.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) })
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
          <p className={`text-sm leading-relaxed whitespace-pre-wrap wrap-break-word ${removed ? 'italic text-zinc-400' : 'text-zinc-700'}`}>{parseMentions(reply.content)}</p>
          {!removed && (reply.attachments ?? []).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {(reply.attachments ?? []).map((att, i) => (
                <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="block">
                  <div className="relative h-32 w-32 rounded-lg overflow-hidden border border-zinc-100 bg-zinc-50 hover:opacity-90 transition">
                    <Image src={att.url} alt="" fill className="object-cover" />
                  </div>
                </a>
              ))}
            </div>
          )}
          {!removed && (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
              <UpvoteButton
                voters={votes}
                voted={voted}
                onToggle={() => onVote(reply.id)}
                disabled={!currentUserId}
              />
              {currentUserId && !isClosed && (
                <button
                  onClick={() => onReply(isReplying ? null : reply.id)}
                  className="text-xs font-semibold text-zinc-400 hover:text-zinc-700 transition cursor-pointer"
                >
                  {isReplying ? 'Cancelar' : 'Responder'}
                </button>
              )}
              {votes.length > 0 && (
                <button
                  type="button"
                  onClick={() => onShowVoters('Votos na resposta', votes)}
                  className="text-xs font-semibold text-zinc-400 opacity-0 transition hover:text-[#2F9E41] group-hover:opacity-100 focus-visible:opacity-100"
                >
                  Ver quem votou
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
  const [topicVoters, setTopicVoters] = useState<Voter[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<Voter | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Reply | null>(null)
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null)
  const [moderationError, setModerationError] = useState<string | null>(null)
  const [pendingTopicDelete, setPendingTopicDelete] = useState(false)
  const [deletingTopic, setDeletingTopic] = useState(false)
  const [topicDeleteError, setTopicDeleteError] = useState<string | null>(null)
  const [closingTopic, setClosingTopic] = useState(false)
  const [pendingClose, setPendingClose] = useState(false)
  const [votersModal, setVotersModal] = useState<{ title: string; voters: Voter[] } | null>(null)

  const load = useCallback(async () => {
    const [{ data: topicData }, user] = await Promise.all([
      supabase
        .from('forum_topics')
        .select('id, title, content, created_at, replies_count, views_count, user_id, is_closed, attachments, users(name, avatar_url), forum_categories(id, name)')
        .eq('id', id)
        .single(),
      getAuthUser(),
    ])

    if (!topicData) { router.push('/forum'); return }

    setTopic(topicData as unknown as Topic)
    setCurrentUserId(user?.id ?? null)
    if (user?.id) {
      const { data: profile } = await supabase
        .from('users')
        .select('name, avatar_url, role')
        .eq('id', user.id)
        .single()
      setCurrentUserRole(profile?.role ?? null)
      setCurrentUserProfile(profile ? { id: user.id, name: profile.name, avatar_url: profile.avatar_url } : null)
    } else {
      setCurrentUserRole(null)
      setCurrentUserProfile(null)
    }

    await supabase.from('forum_topics').update({ views_count: (topicData.views_count ?? 0) + 1 }).eq('id', id)

    const { data: repliesData } = await supabase
      .from('forum_replies')
      .select('id, content, attachments, created_at, parent_id, user_id, users(name, avatar_url)')
      .eq('topic_id', id)
      .order('created_at', { ascending: true })

    const loadedReplies = (repliesData as unknown as Reply[]) ?? []
    setReplies(loadedReplies)

    const [{ data: replyVotes }, { data: topicVotes }] = await Promise.all([
      loadedReplies.length > 0
        ? supabase
            .from('forum_reply_votes')
            .select('reply_id, user_id')
            .in('reply_id', loadedReplies.map(r => r.id))
        : Promise.resolve({ data: [] as { reply_id: string; user_id: string }[] }),
      supabase
        .from('forum_topic_votes')
        .select('user_id')
        .eq('topic_id', id),
    ])

    const voterIds = [...new Set([
      ...(replyVotes ?? []).map(vote => vote.user_id),
      ...(topicVotes ?? []).map(vote => vote.user_id),
    ])]
    const { data: voterProfiles } = voterIds.length > 0
      ? await supabase.from('users').select('id, name, avatar_url').in('id', voterIds)
      : { data: [] as Voter[] }
    const votersById = new Map(
      (voterProfiles ?? []).map(profile => [profile.id, profile as Voter])
    )

    const map: VoteMap = {}
    for (const vote of replyVotes ?? []) {
      const voter = votersById.get(vote.user_id) ?? { id: vote.user_id, name: 'Usuário', avatar_url: null }
      if (!map[vote.reply_id]) map[vote.reply_id] = []
      map[vote.reply_id].push(voter)
    }
    setVoteMap(map)
    setTopicVoters((topicVotes ?? []).flatMap(vote => {
      const voter = votersById.get(vote.user_id) ?? { id: vote.user_id, name: 'Usuário', avatar_url: null }
      return [voter]
    }))
    setLoading(false)
  }, [id, router])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  async function handleTopicVote() {
    if (!currentUserId) return
    const voted = topicVoters.some(voter => voter.id === currentUserId)
    const voter = currentUserProfile ?? { id: currentUserId, name: 'Você', avatar_url: null }
    setTopicVoters(prev => voted ? prev.filter(item => item.id !== currentUserId) : [...prev, voter])
    if (voted) {
      await supabase.from('forum_topic_votes').delete().eq('topic_id', id).eq('user_id', currentUserId)
    } else {
      await supabase.from('forum_topic_votes').insert({ topic_id: id, user_id: currentUserId })
    }
  }

  async function handleReplyVote(replyId: string) {
    if (!currentUserId) return
    const reply = replies.find(r => r.id === replyId)
    if (!reply || isRemovedReply(reply.content)) return
    const voted = (voteMap[replyId] ?? []).some(voter => voter.id === currentUserId)
    const voter = currentUserProfile ?? { id: currentUserId, name: 'Você', avatar_url: null }
    setVoteMap(prev => ({
      ...prev,
      [replyId]: voted
        ? (prev[replyId] ?? []).filter(item => item.id !== currentUserId)
        : [...(prev[replyId] ?? []), voter],
    }))
    if (voted) {
      await supabase.from('forum_reply_votes').delete().eq('reply_id', replyId).eq('user_id', currentUserId)
    } else {
      await supabase.from('forum_reply_votes').insert({ reply_id: replyId, user_id: currentUserId })
    }
  }

  async function handleReply(content: string, parentId: string | null, attachments: Attachment[] = []) {
    if (!currentUserId) return
    if (parentId && replies.some(r => r.id === parentId && isRemovedReply(r.content))) return
    const { data } = await supabase
      .from('forum_replies')
      .insert({ topic_id: id, user_id: currentUserId, content, parent_id: parentId, attachments })
      .select('id, content, attachments, created_at, parent_id, user_id, users(name, avatar_url)')
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

  async function confirmToggleClose() {
    if (!topic || !currentUserId) return
    setClosingTopic(true)
    const newValue = !topic.is_closed
    const { error } = await supabase.from('forum_topics').update({ is_closed: newValue }).eq('id', topic.id)
    if (!error) setTopic((prev) => prev ? { ...prev, is_closed: newValue } : prev)
    setClosingTopic(false)
    setPendingClose(false)
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

  async function confirmDeleteTopic() {
    if (!topic || !currentUserId) return
    const canModerate = currentUserRole === 'admin' || currentUserRole === 'moderador'
    if (topic.user_id !== currentUserId && !canModerate) return

    setTopicDeleteError(null)
    setDeletingTopic(true)
    const { error } = await supabase.from('forum_topics').delete().eq('id', topic.id)
    if (error) {
      setTopicDeleteError('Não foi possível excluir o tópico. Verifique as permissões no banco.')
      setDeletingTopic(false)
      return
    }
    router.push('/forum')
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
      setModerationError('Não foi possível remover esta resposta. Verifique as permissões de moderação no banco.')
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

  function sortNodes(nodes: ReplyNode[]): ReplyNode[] {
    return [...nodes].sort((a, b) => {
      const votesA = (voteMap[a.reply.id] ?? []).length
      const votesB = (voteMap[b.reply.id] ?? []).length
      if (votesB !== votesA) return votesB - votesA
      return new Date(a.reply.created_at).getTime() - new Date(b.reply.created_at).getTime()
    })
  }

  function renderTree(nodes: ReplyNode[], depth = 0): React.ReactNode {
    return sortNodes(nodes).map(node => {
      const visualDepth = Math.min(depth, 5)
      return (
        <div key={node.reply.id} className={depth > 0 ? `pl-2 sm:pl-4 ${visualDepth > 0 ? 'border-l border-zinc-100' : ''}` : ''}>
          <ReplyItem
            reply={node.reply}
            depth={depth}
            currentUserId={currentUserId}
            canModerate={currentUserRole === 'admin' || currentUserRole === 'moderador'}
            isClosed={topic?.is_closed ?? false}
            voteMap={voteMap}
            onVote={handleReplyVote}
            onShowVoters={(title, voters) => setVotersModal({ title, voters })}
            onReply={setReplyingToId}
            onDelete={handleDelete}
            replyingToId={replyingToId}
          />
          {replyingToId === node.reply.id && !isRemovedReply(node.reply.content) && (
            <div className="pl-6 sm:pl-10 pb-2">
              <ReplyForm
                onSubmit={(content, atts) => handleReply(content, node.reply.id, atts)}
                onCancel={() => setReplyingToId(null)}
                placeholder={`Respondendo a ${node.reply.users?.name ?? 'Anonimo'}...`}
              />
            </div>
          )}
          {node.children.length > 0 && (
            <div className="ml-1 sm:ml-4">
              {renderTree(node.children, depth + 1)}
            </div>
          )}
        </div>
      )
    })
  }

  if (loading) {
    return (
      <div className="px-4 md:px-6 py-8 w-full animate-pulse space-y-4">
        <div className="h-4 w-32 bg-zinc-100 rounded" />
        <div className="h-8 w-3/4 bg-zinc-100 rounded" />
        <div className="h-4 w-48 bg-zinc-100 rounded" />
      </div>
    )
  }

  if (!topic) return null

  const topicVoted = !!currentUserId && topicVoters.some(voter => voter.id === currentUserId)
  const tree = buildTree(replies)
  const topLevelCount = replies.filter(r => !r.parent_id && !isRemovedReply(r.content)).length
  const cat = topic.forum_categories
  const attachments = topic.attachments ?? []
  const topicDateObj = new Date(topic.created_at)
  const topicDate = topicDateObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', ...(topicDateObj.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) })
  const canModerate = currentUserRole === 'admin' || currentUserRole === 'moderador'
  const canDeleteTopic = !!currentUserId && (topic.user_id === currentUserId || canModerate)
  const isOwnTopic = currentUserId === topic.user_id
  const canCloseTopic = !!currentUserId && (topic.user_id === currentUserId || canModerate)

  return (
    <div className="px-4 md:px-6 py-8 w-full">
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
        <div className="group flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <h1 className="mb-4 text-2xl sm:text-3xl font-black text-zinc-900 leading-tight wrap-break-word">{topic.title}</h1>
            <div className="flex items-start gap-3">
              <Link href={`/usuarios/${topic.user_id}`} className="rounded-full hover:opacity-80 transition shrink-0">
                <Avatar author={topic.users} size={32} />
              </Link>
              <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-zinc-400">
                <Link href={`/usuarios/${topic.user_id}`} className="font-medium text-zinc-600 hover:text-[#2F9E41] transition">
                  {topic.users?.name ?? 'Anonimo'}
                </Link>
                <span aria-hidden="true">&bull;</span>
                <span>{topicDate}</span>
                <span aria-hidden="true">&bull;</span>
                <span>{topic.replies_count ?? 0} respostas</span>
                <span aria-hidden="true">&bull;</span>
                <span>{(topic.views_count ?? 0) + 1} views</span>
              </div>
            </div>
          </div>
          <div className="shrink-0 self-start sm:pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <UpvoteButton
                voters={topicVoters}
                voted={topicVoted}
                onToggle={handleTopicVote}
                disabled={!currentUserId}
              />
              {topicVoters.length > 0 && (
                <button
                  type="button"
                  onClick={() => setVotersModal({ title: 'Votos no tópico', voters: topicVoters })}
                  className="text-xs font-semibold text-zinc-400 opacity-0 transition hover:text-[#2F9E41] group-hover:opacity-100 focus-visible:opacity-100"
                >
                  Ver quem votou
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-100 pt-8">
        <p className="text-base text-zinc-800 leading-relaxed whitespace-pre-wrap wrap-break-word">{parseMentions(topic.content)}</p>

      
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
                ) : att.type === 'video' ? (() => {
                  const embed = getEmbedUrl(att.url)
                  return embed
                    ? <iframe src={embed} className="w-full aspect-video" allowFullScreen />
                    : <video src={att.url} controls className="w-full aspect-video" />
                })() : (
                  <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 transition hover:bg-zinc-100">
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="shrink-0 text-zinc-400">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path d="M14 2v6h6" />
                    </svg>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{att.name ?? 'Arquivo anexado'}</span>
                      {att.size && <span className="block text-xs text-zinc-400">{formatFileSize(att.size)}</span>}
                    </span>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {(canCloseTopic || canDeleteTopic) && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {canCloseTopic && (
            <button
              type="button"
              onClick={() => setPendingClose(true)}
              disabled={closingTopic}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                topic.is_closed
                  ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                  : 'border-zinc-200 text-zinc-500 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700'
              }`}
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                {topic.is_closed
                  ? <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></>
                  : <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>
                }
              </svg>
              {closingTopic ? 'Aguarde...' : topic.is_closed ? 'Reabrir tópico' : 'Encerrar tópico'}
            </button>
          )}
          {canDeleteTopic && (
            <button
              type="button"
              onClick={() => { setTopicDeleteError(null); setPendingTopicDelete(true) }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
              </svg>
              {isOwnTopic ? 'Excluir tópico' : 'Remover tópico'}
            </button>
          )}
        </div>
      )}

      {topic.is_closed && (
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Este tópico foi encerrado. Nenhuma nova contribuição é permitida.</span>
        </div>
      )}


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
          {topic.is_closed ? (
            <p className="text-sm text-zinc-400 italic">Este tópico está encerrado.</p>
          ) : currentUserId ? (
            <div className="flex flex-col gap-3">
              <label className="text-sm font-semibold text-zinc-700">Sua resposta</label>
              <ReplyForm
                onSubmit={(content, atts) => handleReply(content, null, atts)}
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

      {votersModal && (
        <VotersModal
          title={votersModal.title}
          voters={votersModal.voters}
          onClose={() => setVotersModal(null)}
        />
      )}

      {pendingClose && topic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-full ${topic.is_closed ? 'bg-green-50 text-[#2F9E41]' : 'bg-amber-50 text-amber-600'}`}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                {topic.is_closed
                  ? <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></>
                  : <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>
                }
              </svg>
            </div>
            <h3 className="text-base font-semibold text-zinc-900">
              {topic.is_closed ? 'Reabrir tópico?' : 'Encerrar tópico?'}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              {topic.is_closed
                ? 'O tópico voltará a aceitar novas respostas.'
                : 'Ninguém mais poderá responder ou comentar neste tópico. Você pode reabrir a qualquer momento.'}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setPendingClose(false)}
                disabled={closingTopic}
                className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmToggleClose}
                disabled={closingTopic}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50 ${topic.is_closed ? 'bg-[#2F9E41] hover:opacity-90' : 'bg-amber-500 hover:bg-amber-600'}`}
              >
                {closingTopic ? 'Aguarde...' : topic.is_closed ? 'Reabrir' : 'Encerrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingTopicDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-500">
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-zinc-900">
              {isOwnTopic ? 'Excluir tópico?' : 'Remover tópico?'}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              O tópico e todas as respostas serão removidos permanentemente. Esta ação não pode ser desfeita.
            </p>
            {topicDeleteError && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                {topicDeleteError}
              </p>
            )}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => { setPendingTopicDelete(false); setTopicDeleteError(null) }}
                disabled={deletingTopic}
                className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteTopic}
                disabled={deletingTopic}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                {deletingTopic ? 'Removendo...' : isOwnTopic ? 'Excluir' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      )}

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
