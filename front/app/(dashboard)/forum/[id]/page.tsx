'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'
import { getAuthUser } from '@/app/lib/auth'
import UserAvatar from '@/app/components/UserAvatar'
import UserMascotBadge, { type UserMascot } from '@/app/components/UserMascotBadge'
import UserHoverCard from '@/app/components/UserHoverCard'
import { formatFileSize } from '@/app/lib/files'
import MentionTextarea from '@/app/components/MentionTextarea'
import { parseMentions } from '@/app/lib/mentions'
import { useImageCropper } from '@/app/components/ImageCropper'

type Author = { name: string; avatar_url: string | null; selected_mascot: UserMascot }
type Voter = Author & { id: string }
type Category = { id: string; name: string }
type Attachment = { type: 'image' | 'video' | 'file'; url: string; name?: string; size?: number }
type MascotInfo = { id: string; name: string; image_url: string; min_xp?: number | null }
type PollOption = { id: string; text: string; display_order: number }
type Poll = { id: string; question: string; allows_multiple: boolean; options: PollOption[] }

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
  mascot_id: string | null
  sticker: { name: string; image_url: string } | null
  attachments: Attachment[] | null
  users: Author | null
}

type ReplyNode = { reply: Reply; children: ReplyNode[] }
type VoteMap = Record<string, Voter[]>

const MODERATOR_REMOVED_REPLY = 'Esta resposta foi removida por um moderador.'
const AUTHOR_REMOVED_REPLY = 'Esta resposta foi removida pelo autor.'
const COMMENT_MASCOT_BADGE_SIZE = 24

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
              <span className="inline-flex min-w-0 items-center gap-1 text-sm font-medium text-zinc-700">
                <span className="truncate">{voter.name}</span>
                <UserMascotBadge mascot={voter.selected_mascot} size={19} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function ReplyForm({ onSubmit, onCancel, placeholder = 'Escreva sua resposta...', ownedMascots = [] }: {
  onSubmit: (content: string, attachments: Attachment[], mascotId: string | null) => Promise<void>
  onCancel?: () => void
  placeholder?: string
  ownedMascots?: MascotInfo[]
}) {
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [selectedMascot, setSelectedMascot] = useState<MascotInfo | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { cropImage, cropperNode } = useImageCropper('16:9')

  async function uploadFiles(files: File[]) {
    if (!files.length) return
    setUploading(true)
    const user = await getAuthUser()
    if (!user) { setUploading(false); return }
    for (const file of files) {
      const uploadFile = await cropImage(file)
      if (!uploadFile) continue
      const ext = uploadFile.name.split('.').pop()
      const path = `forum/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('forum-media').upload(path, uploadFile)
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('forum-media').getPublicUrl(path)
        setAttachments(prev => [...prev, { type: 'image', url: publicUrl, name: uploadFile.name, size: uploadFile.size }])
      }
    }
    setUploading(false)
  }

  async function handle(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() && attachments.length === 0 && !selectedMascot) return
    setSubmitting(true)
    await onSubmit(content.trim(), attachments, selectedMascot?.id ?? null)
    setContent('')
    setAttachments([])
    setSelectedMascot(null)
    setSubmitting(false)
  }

  return (
    <form onSubmit={handle} className="flex flex-col gap-2 mt-3">
      {cropperNode}
      <div className="rounded-xl border border-zinc-200 overflow-hidden focus-within:border-zinc-400 transition">
        <MentionTextarea
          value={content}
          onChange={setContent}
          rows={3}
          className="w-full resize-none px-3 py-2 text-sm text-zinc-900 outline-none"
          placeholder={placeholder}
        />
        {ownedMascots.length > 0 && (
          <div className="flex flex-wrap gap-1 border-t border-zinc-100 px-2 py-1.5">
            {ownedMascots.map((m) => (
              <button
                key={m.id}
                type="button"
                title={m.name}
                onClick={() => setSelectedMascot(prev => prev?.id === m.id ? null : m)}
                className={`rounded-lg p-1 transition hover:bg-zinc-100 ${selectedMascot?.id === m.id ? 'bg-[#2F9E41]/10 ring-2 ring-[#2F9E41]/40' : ''}`}
              >
                <Image src={m.image_url} alt={m.name} width={36} height={36} className="h-9 w-9 object-contain" />
              </button>
            ))}
          </div>
        )}
      </div>

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
            disabled={submitting || uploading || (!content.trim() && attachments.length === 0 && !selectedMascot)}
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
  const fmtYear = (d: Date) => new Intl.DateTimeFormat('en', { timeZone: 'America/Sao_Paulo', year: 'numeric' }).format(d)
  const date = replyDateObj.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'short', ...(fmtYear(replyDateObj) !== fmtYear(new Date()) ? { year: 'numeric' } : {}) })
  const avatarSize = depth === 0 ? 32 : 26

  return (
    <div className="group py-4">
      <div className="flex items-start gap-3">
        <Link href={`/usuarios/${reply.user_id}`} className="rounded-full hover:opacity-80 transition">
          <Avatar author={reply.users} size={avatarSize} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <UserHoverCard userId={reply.user_id}>
              <Link href={`/usuarios/${reply.user_id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-800 hover:text-[#2F9E41] transition">
                <span>{reply.users?.name ?? 'Anonimo'}</span>
                <UserMascotBadge mascot={reply.users?.selected_mascot ?? null} size={COMMENT_MASCOT_BADGE_SIZE} />
              </Link>
            </UserHoverCard>
            <span className="text-xs text-zinc-400">{date}</span>
          </div>
          <p className={`text-sm leading-relaxed whitespace-pre-wrap wrap-break-word ${removed ? 'italic text-zinc-400' : 'text-zinc-700'}`}>{parseMentions(reply.content)}</p>
          {!removed && reply.sticker && (
            <div className="mt-2 inline-flex flex-col items-center gap-1">
              <div className="rounded-2xl border border-[#2F9E41]/20 bg-[#2F9E41]/5 p-3">
                <Image src={reply.sticker.image_url} alt={reply.sticker.name} width={96} height={96} className="h-24 w-24 object-contain drop-shadow-sm" />
              </div>
              <span className="text-[10px] font-semibold text-[#2F9E41]/70">{reply.sticker.name}</span>
            </div>
          )}
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

function PollCard({ poll, voteCounts, userVotes, onVote, canVote, disabled }: {
  poll: Poll
  voteCounts: Record<string, number>
  userVotes: string[]
  onVote: (optionId: string) => void
  canVote: boolean
  disabled: boolean
}) {
  const totalVotes = poll.options.reduce((sum, o) => sum + (voteCounts[o.id] ?? 0), 0)
  const hasVoted = userVotes.length > 0

  return (
    <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="mb-4 flex items-start gap-2">
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#2F9E41" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
          <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
        <p className="text-sm font-semibold text-zinc-800">{poll.question}</p>
      </div>
      <div className="flex flex-col gap-2">
        {poll.options.map(option => {
          const count = voteCounts[option.id] ?? 0
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
          const isVoted = userVotes.includes(option.id)
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => canVote && !disabled && onVote(option.id)}
              disabled={disabled || !canVote}
              className={`relative overflow-hidden rounded-xl border px-3 py-2.5 text-left transition ${
                isVoted ? 'border-[#2F9E41] bg-white' : 'border-zinc-200 bg-white hover:border-zinc-300'
              } ${!canVote ? 'cursor-default' : 'cursor-pointer'}`}
            >
              {(hasVoted || !canVote) && (
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-500 ${isVoted ? 'bg-[#2F9E41]/10' : 'bg-zinc-100'}`}
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  {poll.allows_multiple ? (
                    <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${isVoted ? 'border-[#2F9E41] bg-[#2F9E41] text-white' : 'border-zinc-300'}`}>
                      {isVoted && <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5}><path d="M20 6 9 17l-5-5"/></svg>}
                    </div>
                  ) : (
                    <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${isVoted ? 'border-[#2F9E41]' : 'border-zinc-300'}`}>
                      {isVoted && <div className="h-2 w-2 rounded-full bg-[#2F9E41]" />}
                    </div>
                  )}
                  <span className={`text-sm truncate ${isVoted ? 'font-medium text-zinc-900' : 'text-zinc-700'}`}>{option.text}</span>
                </div>
                {(hasVoted || !canVote) && (
                  <span className={`shrink-0 text-xs font-semibold ${isVoted ? 'text-[#2F9E41]' : 'text-zinc-400'}`}>{pct}%</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-xs text-zinc-400">
        {totalVotes} {totalVotes === 1 ? 'voto' : 'votos'}
        {poll.allows_multiple ? ' · Múltipla escolha' : ''}
        {!canVote ? ' · Faça login para votar' : ''}
      </p>
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
  const [ownedMascots, setOwnedMascots] = useState<MascotInfo[]>([])
  const [poll, setPoll] = useState<Poll | null>(null)
  const [pollVoteCounts, setPollVoteCounts] = useState<Record<string, number>>({})
  const [pollUserVotes, setPollUserVotes] = useState<string[]>([])
  const [pollVoting, setPollVoting] = useState(false)

  const load = useCallback(async () => {
    const [{ data: topicData }, user] = await Promise.all([
      supabase
        .from('forum_topics')
        .select('id, title, content, created_at, replies_count, views_count, user_id, is_closed, attachments, users(name, avatar_url, selected_mascot:mascots(name, image_url)), forum_categories(id, name)')
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
        .select('name, avatar_url, role, xp, selected_mascot_id, selected_mascot:mascots(name, image_url)')
        .eq('id', user.id)
        .single()
      setCurrentUserRole(profile?.role ?? null)
      setCurrentUserProfile(profile ? { id: user.id, name: profile.name, avatar_url: profile.avatar_url, selected_mascot: profile.selected_mascot as UserMascot } : null)
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
    } else {
      setCurrentUserRole(null)
      setCurrentUserProfile(null)
    }

    await supabase.from('forum_topics').update({ views_count: (topicData.views_count ?? 0) + 1 }).eq('id', id)

    const { data: pollData } = await supabase
      .from('forum_polls')
      .select('id, question, allows_multiple, forum_poll_options(id, text, display_order)')
      .eq('topic_id', id)
      .maybeSingle()

    if (pollData) {
      type RawPoll = typeof pollData & { forum_poll_options: PollOption[] }
      const raw = pollData as RawPoll
      const options = [...(raw.forum_poll_options ?? [])].sort((a, b) => a.display_order - b.display_order)
      setPoll({ id: raw.id, question: raw.question, allows_multiple: raw.allows_multiple, options })
      if (options.length > 0) {
        const optionIds = options.map(o => o.id)
        const { data: votesData } = await supabase
          .from('forum_poll_votes')
          .select('option_id, user_id')
          .in('option_id', optionIds)
        const counts: Record<string, number> = {}
        for (const v of votesData ?? []) counts[v.option_id] = (counts[v.option_id] ?? 0) + 1
        setPollVoteCounts(counts)
        if (user?.id) setPollUserVotes((votesData ?? []).filter(v => v.user_id === user.id).map(v => v.option_id))
      }
    }

    const { data: repliesData } = await supabase
      .from('forum_replies')
      .select('id, content, attachments, created_at, parent_id, user_id, mascot_id, sticker:mascots(name, image_url), users(name, avatar_url, selected_mascot:mascots(name, image_url))')
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
            .eq('is_voted', true)
        : Promise.resolve({ data: [] as { reply_id: string; user_id: string }[] }),
      supabase
        .from('forum_topic_votes')
        .select('user_id')
        .eq('topic_id', id)
        .eq('is_voted', true),
    ])

    const voterIds = [...new Set([
      ...(replyVotes ?? []).map(vote => vote.user_id),
      ...(topicVotes ?? []).map(vote => vote.user_id),
    ])]
    const { data: voterProfiles } = voterIds.length > 0
      ? await supabase.from('users').select('id, name, avatar_url, selected_mascot:mascots(name, image_url)').in('id', voterIds)
      : { data: [] as Voter[] }
    const votersById = new Map(
      (voterProfiles ?? []).map(profile => [profile.id, profile as Voter])
    )

    const map: VoteMap = {}
    for (const vote of replyVotes ?? []) {
      const voter = votersById.get(vote.user_id) ?? { id: vote.user_id, name: 'Usuário', avatar_url: null, selected_mascot: null }
      if (!map[vote.reply_id]) map[vote.reply_id] = []
      map[vote.reply_id].push(voter)
    }
    setVoteMap(map)
    setTopicVoters((topicVotes ?? []).flatMap(vote => {
      const voter = votersById.get(vote.user_id) ?? { id: vote.user_id, name: 'Usuário', avatar_url: null, selected_mascot: null }
      return [voter]
    }))
    setLoading(false)
  }, [id, router])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  async function handleTopicVote() {
    if (!currentUserId) return
    const voted = topicVoters.some(voter => voter.id === currentUserId)
    const voter = currentUserProfile ?? { id: currentUserId, name: 'Você', avatar_url: null, selected_mascot: null }
    setTopicVoters(prev => voted ? prev.filter(item => item.id !== currentUserId) : [...prev, voter])
    if (voted) {
      await supabase.from('forum_topic_votes').update({ is_voted: false }).eq('topic_id', id).eq('user_id', currentUserId)
    } else {
      await supabase.from('forum_topic_votes').upsert({ topic_id: id, user_id: currentUserId, is_voted: true }, { onConflict: 'user_id,topic_id' })
    }
  }

  async function handleReplyVote(replyId: string) {
    if (!currentUserId) return
    const reply = replies.find(r => r.id === replyId)
    if (!reply || isRemovedReply(reply.content)) return
    const voted = (voteMap[replyId] ?? []).some(voter => voter.id === currentUserId)
    const voter = currentUserProfile ?? { id: currentUserId, name: 'Você', avatar_url: null, selected_mascot: null }
    setVoteMap(prev => ({
      ...prev,
      [replyId]: voted
        ? (prev[replyId] ?? []).filter(item => item.id !== currentUserId)
        : [...(prev[replyId] ?? []), voter],
    }))
    if (voted) {
      await supabase.from('forum_reply_votes').update({ is_voted: false }).eq('reply_id', replyId).eq('user_id', currentUserId)
    } else {
      await supabase.from('forum_reply_votes').upsert({ reply_id: replyId, user_id: currentUserId, is_voted: true }, { onConflict: 'user_id,reply_id' })
    }
  }

  async function handlePollVote(optionId: string) {
    if (!currentUserId || !poll) return
    setPollVoting(true)
    const alreadyVoted = pollUserVotes.includes(optionId)
    if (alreadyVoted) {
      await supabase.from('forum_poll_votes').delete().eq('option_id', optionId).eq('user_id', currentUserId)
      setPollUserVotes(prev => prev.filter(id => id !== optionId))
      setPollVoteCounts(prev => ({ ...prev, [optionId]: Math.max(0, (prev[optionId] ?? 0) - 1) }))
    } else {
      if (!poll.allows_multiple && pollUserVotes.length > 0) {
        for (const prevId of pollUserVotes) {
          await supabase.from('forum_poll_votes').delete().eq('option_id', prevId).eq('user_id', currentUserId)
        }
        setPollVoteCounts(prev => {
          const next = { ...prev }
          for (const prevId of pollUserVotes) next[prevId] = Math.max(0, (next[prevId] ?? 0) - 1)
          return next
        })
        setPollUserVotes([])
      }
      await supabase.from('forum_poll_votes').insert({ poll_id: poll.id, option_id: optionId, user_id: currentUserId })
      setPollUserVotes(prev => [...prev, optionId])
      setPollVoteCounts(prev => ({ ...prev, [optionId]: (prev[optionId] ?? 0) + 1 }))
    }
    setPollVoting(false)
  }

  async function handleReply(content: string, parentId: string | null, attachments: Attachment[] = [], mascotId: string | null = null) {
    if (!currentUserId) return
    if (parentId && replies.some(r => r.id === parentId && isRemovedReply(r.content))) return
    const { data } = await supabase
      .from('forum_replies')
      .insert({ topic_id: id, user_id: currentUserId, content, parent_id: parentId, attachments, mascot_id: mascotId })
      .select('id, content, attachments, created_at, parent_id, user_id, mascot_id, sticker:mascots(name, image_url), users(name, avatar_url, selected_mascot:mascots(name, image_url))')
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
                onSubmit={(content, atts, mascotId) => handleReply(content, node.reply.id, atts, mascotId)}
                onCancel={() => setReplyingToId(null)}
                placeholder={`Respondendo a ${node.reply.users?.name ?? 'Anonimo'}...`}
                ownedMascots={ownedMascots}
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
  const fmtTopicYear = (d: Date) => new Intl.DateTimeFormat('en', { timeZone: 'America/Sao_Paulo', year: 'numeric' }).format(d)
  const topicDate = topicDateObj.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'long', ...(fmtTopicYear(topicDateObj) !== fmtTopicYear(new Date()) ? { year: 'numeric' } : {}) })
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
        <div className="group">
          <div className="min-w-0">
            <h1 className="mb-4 text-2xl sm:text-3xl font-black text-zinc-900 leading-tight wrap-break-word">{topic.title}</h1>
            <div className="flex items-start gap-3">
              <Link href={`/usuarios/${topic.user_id}`} className="rounded-full hover:opacity-80 transition shrink-0">
                <Avatar author={topic.users} size={32} />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <UserHoverCard userId={topic.user_id}>
                      <Link href={`/usuarios/${topic.user_id}`} className="inline-flex items-center gap-1 font-medium text-zinc-600 hover:text-[#2F9E41] transition">
                        <span>{topic.users?.name ?? 'Anonimo'}</span>
                        <UserMascotBadge mascot={topic.users?.selected_mascot ?? null} size={19} />
                      </Link>
                    </UserHoverCard>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
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
                  <div className="shrink-0 text-right text-xs text-zinc-400 leading-relaxed">
                    <span className="block">{topicDate}</span>
                    <span className="block mt-0.5">{topic.replies_count ?? 0} respostas · {(topic.views_count ?? 0) + 1} views</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-100 pt-8">
        <p className="text-base text-zinc-800 leading-relaxed whitespace-pre-wrap wrap-break-word">{parseMentions(topic.content)}</p>

        {poll && (
          <PollCard
            poll={poll}
            voteCounts={pollVoteCounts}
            userVotes={pollUserVotes}
            onVote={handlePollVote}
            canVote={!!currentUserId && !topic.is_closed}
            disabled={pollVoting}
          />
        )}

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
                onSubmit={(content, atts, mascotId) => handleReply(content, null, atts, mascotId)}
                placeholder="Escreva sua resposta..."
                ownedMascots={ownedMascots}
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
