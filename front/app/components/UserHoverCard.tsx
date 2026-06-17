'use client'

import { type ReactNode, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import UserAvatar from '@/app/components/UserAvatar'
import UserMascotBadge, { type UserMascot } from '@/app/components/UserMascotBadge'
import { supabase } from '@/app/lib/supabase'
import { getAuthUser } from '@/app/lib/auth'

type HoverProfile = {
  id: string
  name: string
  avatar_url: string | null
  semester: number | null
  role: string | null
  bio: string | null
  preferred_area: string | null
  selected_mascot: UserMascot
}

export default function UserHoverCard({
  userId,
  children,
}: {
  userId: string | null | undefined
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState<HoverProfile | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function loadProfile() {
    if (!userId || profile || loading) return
    setLoading(true)
    const [{ data }, authUser] = await Promise.all([
      supabase
      .from('users')
      .select('id, name, avatar_url, semester, role, bio, preferred_area, selected_mascot:mascots(name, image_url)')
      .eq('id', userId)
      .maybeSingle(),
      getAuthUser(),
    ])
    if (data) setProfile(data as unknown as HoverProfile)
    setCurrentUserId(authUser?.id ?? null)
    setLoading(false)
  }

  function show() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) {
      const width = 288
      const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12)
      setPosition({ top: rect.bottom + 8, left })
    }
    setOpen(true)
    void loadProfile()
  }

  function hide() {
    closeTimer.current = setTimeout(() => setOpen(false), 120)
  }

  if (!userId) return <>{children}</>

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}

      {open && position && createPortal(
        <span
          className="fixed z-[100] w-72 rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-xl"
          style={{ top: position.top, left: position.left }}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          {profile ? (
            <span className="flex flex-col gap-3">
              <span className="flex items-start gap-3">
                <UserAvatar src={profile.avatar_url} name={profile.name} className="h-12 w-12" sizes="48px" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-zinc-900">{profile.name}</span>
                    <UserMascotBadge mascot={profile.selected_mascot} size={24} />
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-400">{profileLabel(profile)}</span>
                </span>
              </span>

              {profile.bio && (
                <span className="line-clamp-3 text-xs leading-relaxed text-zinc-500">{profile.bio}</span>
              )}

              {splitPreferredAreas(profile.preferred_area).length > 0 && (
                <span className="flex flex-wrap gap-1.5">
                  {splitPreferredAreas(profile.preferred_area).slice(0, 3).map((area) => (
                    <span key={area} className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-[#2F9E41]">
                      {formatArea(area)}
                    </span>
                  ))}
                </span>
              )}

              <Link href={profile.id === currentUserId ? '/perfil' : `/usuarios/${profile.id}`} className="text-xs font-semibold text-[#2F9E41] hover:opacity-75">
                Ver perfil completo
              </Link>
            </span>
          ) : (
            <span className="block text-xs text-zinc-400">{loading ? 'Carregando perfil...' : 'Perfil indisponível'}</span>
          )}
        </span>,
        document.body
      )}
    </span>
  )
}

function profileLabel(profile: Pick<HoverProfile, 'role' | 'semester'>) {
  if (profile.role === 'admin') return 'Administrador'
  if (profile.role === 'moderador') return 'Moderador'
  if (profile.role === 'professor') return 'Professor'
  if (profile.role === 'egresso') return 'Ex-aluno'
  if (profile.semester) return `${profile.semester}º semestre`
  return 'Membro'
}

function splitPreferredAreas(value?: string | null) {
  return value?.split(',').map((item) => item.trim()).filter(Boolean) ?? []
}

function formatArea(value: string) {
  const labels: Record<string, string> = {
    'front-end': 'Front-end',
    'back-end': 'Back-end',
    'full-stack': 'Full-stack',
    mobile: 'Mobile',
    dados: 'Dados & IA',
    devops: 'DevOps & Cloud',
    'ux-design': 'UX & Design',
    seguranca: 'Segurança',
  }
  return labels[value] ?? value
    .split(/([\s/-]+)/)
    .map((part) => (/^[\s/-]+$/.test(part) ? part : part.charAt(0).toLocaleUpperCase('pt-BR') + part.slice(1)))
    .join('')
}
