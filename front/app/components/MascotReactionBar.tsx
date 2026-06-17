'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { getAuthUser } from '@/app/lib/auth'

export type MascotInfo = {
  id: string
  name: string
  image_url: string
}

export type MascotReaction = {
  target_id: string
  mascot_id: string
  user_id: string
  mascots: MascotInfo
}

type Props = {
  targetType: string
  targetId: string
  userId: string | null
  // Quando fornecido pelo pai (ex: Comments.tsx), evita N queries
  allReactions?: MascotReaction[]
  availableMascots?: MascotInfo[]
  onToggle?: (targetId: string, mascotId: string, add: boolean) => void
}

export default function MascotReactionBar({
  targetType,
  targetId,
  userId,
  allReactions,
  availableMascots: propMascots,
  onToggle,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const isManaged = allReactions !== undefined

  const [reactions, setReactions] = useState<MascotReaction[]>([])
  const [mascots, setMascots] = useState<MascotInfo[]>(propMascots ?? [])
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Modo standalone: carrega reações do DB
  const loadStandalone = useCallback(async () => {
    const [{ data: rData }, { data: mData }] = await Promise.all([
      supabase
        .from('mascot_reactions')
        .select('target_id, mascot_id, user_id, mascots(id, name, image_url)')
        .eq('target_type', targetType)
        .eq('target_id', targetId),
      propMascots
        ? Promise.resolve({ data: propMascots })
        : supabase.from('mascots').select('id, name, image_url').eq('is_active', true).order('min_xp'),
    ])
    if (rData) setReactions(rData as unknown as MascotReaction[])
    if (mData && !propMascots) setMascots(mData as MascotInfo[])
  }, [targetType, targetId, propMascots])

  useEffect(() => {
    if (!isManaged) void loadStandalone()
  }, [isManaged, loadStandalone])

  // Modo gerenciado: usa dados do pai
  useEffect(() => {
    if (isManaged) {
      setReactions(allReactions.filter(r => r.target_id === targetId))
    }
  }, [isManaged, allReactions, targetId])

  useEffect(() => {
    if (propMascots) setMascots(propMascots)
  }, [propMascots])

  // Fecha picker no clique fora
  useEffect(() => {
    function close(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  // Agrupa reações por mascote
  const groups = new Map<string, { mascot: MascotInfo; count: number; isMine: boolean }>()
  for (const r of reactions) {
    const g = groups.get(r.mascot_id)
    if (g) {
      g.count++
      if (r.user_id === userId) g.isMine = true
    } else {
      groups.set(r.mascot_id, { mascot: r.mascots, count: 1, isMine: r.user_id === userId })
    }
  }
  const groupList = Array.from(groups.values())

  async function toggle(mascotId: string) {
    if (!userId) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
      return
    }

    const alreadyReacted = reactions.some(r => r.mascot_id === mascotId && r.user_id === userId)
    setPickerOpen(false)

    if (alreadyReacted) {
      // Remove otimisticamente
      setReactions(prev => prev.filter(r => !(r.mascot_id === mascotId && r.user_id === userId)))
      onToggle?.(targetId, mascotId, false)
      await supabase.from('mascot_reactions')
        .delete()
        .eq('user_id', userId)
        .eq('mascot_id', mascotId)
        .eq('target_type', targetType)
        .eq('target_id', targetId)
    } else {
      const mascot = mascots.find(m => m.id === mascotId)
      if (!mascot) return
      // Adiciona otimisticamente
      const newReaction: MascotReaction = { target_id: targetId, mascot_id: mascotId, user_id: userId, mascots: mascot }
      setReactions(prev => [...prev, newReaction])
      onToggle?.(targetId, mascotId, true)
      await supabase.from('mascot_reactions').insert({
        user_id: userId,
        mascot_id: mascotId,
        target_type: targetType,
        target_id: targetId,
      })
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {/* Pills de reação existentes */}
      {groupList.map(({ mascot, count, isMine }) => (
        <button
          key={mascot.id}
          type="button"
          onClick={() => toggle(mascot.id)}
          title={mascot.name}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition select-none ${
            isMine
              ? 'border-[#2F9E41]/40 bg-[#2F9E41]/10 text-[#2F9E41]'
              : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
          }`}
        >
          <Image
            src={mascot.image_url}
            alt={mascot.name}
            width={18}
            height={18}
            className="h-[18px] w-[18px] object-contain drop-shadow-sm"
          />
          <span>{count}</span>
        </button>
      ))}

      {/* Botão "+" + picker — sempre visível */}
      <div ref={pickerRef} className="relative">
        {pickerOpen && (
          <div className="absolute bottom-full left-0 mb-1.5 z-50 w-52 rounded-xl border border-zinc-200 bg-white p-2 shadow-xl">
            <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Reagir com mascote
            </p>
            {mascots.length > 0 ? (
              <div className="grid grid-cols-5 gap-0.5">
                {mascots.map((mascot) => {
                  const isMine = reactions.some(r => r.mascot_id === mascot.id && r.user_id === userId)
                  return (
                    <button
                      key={mascot.id}
                      type="button"
                      onClick={() => toggle(mascot.id)}
                      title={mascot.name}
                      className={`flex items-center justify-center rounded-lg p-1.5 transition hover:bg-zinc-100 ${
                        isMine ? 'bg-[#2F9E41]/10 ring-1 ring-[#2F9E41]/30' : ''
                      }`}
                    >
                      <Image
                        src={mascot.image_url}
                        alt={mascot.name}
                        width={28}
                        height={28}
                        className="h-7 w-7 object-contain drop-shadow-sm"
                      />
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="py-2 text-center text-xs text-zinc-400">Nenhum mascote disponível</p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setPickerOpen(o => !o)}
          title="Reagir com mascote"
          className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-zinc-200 text-xs text-zinc-400 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-600"
        >
          +
        </button>
      </div>
    </div>
  )
}
