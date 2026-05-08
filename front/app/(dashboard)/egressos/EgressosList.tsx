'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

type Egresso = {
  id: string
  user_id: string | null
  name: string
  avatar_url: string | null
  graduation_year: number | null
  role: string | null
  company: string | null
  linkedin: string | null
  bio: string | null
}

function EgressoRow({ egresso, index }: { egresso: Egresso; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const inner = (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-start gap-3 md:gap-6 py-5 border-b border-zinc-100 last:border-0 rounded-xl -mx-2 px-2 hover:bg-zinc-50 transition-colors"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease, background-color 0.15s ease',
        transitionDelay: `${index * 60}ms`,
      }}
    >
      <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden bg-zinc-100 shrink-0 mt-0.5">
        {egresso.avatar_url ? (
          <Image
            src={egresso.avatar_url}
            alt={egresso.name}
            fill
            className="object-cover"
            style={{ transform: hovered ? 'scale(1.08)' : 'scale(1)', transition: 'transform 0.4s ease' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-base font-black text-zinc-300">
            {egresso.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p
              className="text-sm md:text-base font-black leading-tight transition-colors duration-300 truncate"
              style={{ color: hovered ? '#2F9E41' : '#18181b' }}
            >
              {egresso.name}
            </p>
            {(egresso.role || egresso.company) && (
              <p
                className="text-xs md:text-sm leading-snug mt-0.5 transition-colors duration-300 truncate"
                style={{ color: hovered ? '#52525b' : '#a1a1aa' }}
              >
                {egresso.role}{egresso.role && egresso.company ? ' · ' : ''}{egresso.company}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0 md:hidden">
            {egresso.graduation_year && (
              <span className="text-xs text-zinc-300 font-semibold tabular-nums">{egresso.graduation_year}</span>
            )}
            {egresso.linkedin && (
              <span className="text-xs font-semibold text-[#2F9E41]">LinkedIn ↗</span>
            )}
          </div>
        </div>

        {egresso.bio && (
          <>
            <p className="text-xs text-zinc-400 line-clamp-1 mt-1 md:hidden">{egresso.bio}</p>
            <p
              className="hidden md:block text-xs text-zinc-400 line-clamp-1 mt-1"
              style={{
                opacity: hovered ? 1 : 0,
                maxHeight: hovered ? '20px' : '0px',
                overflow: 'hidden',
                transition: 'opacity 0.3s ease, max-height 0.3s ease',
              }}
            >
              {egresso.bio}
            </p>
          </>
        )}
      </div>

      <div className="hidden md:flex items-center gap-4 shrink-0">
        {egresso.graduation_year && (
          <span className="text-xs text-zinc-300 font-semibold tabular-nums">{egresso.graduation_year}</span>
        )}
        {egresso.linkedin && (
          <span
            className="text-xs font-semibold transition-colors duration-300"
            style={{ color: hovered ? '#2F9E41' : '#d4d4d8' }}
          >
            LinkedIn ↗
          </span>
        )}
      </div>
    </div>
  )

  if (egresso.user_id) {
    return <Link href={`/usuarios/${egresso.user_id}`}>{inner}</Link>
  }
  return inner
}

export default function EgressosList({ egressos }: { egressos: Egresso[] }) {
  return (
    <div>
      {egressos.map((egresso, i) => (
        <EgressoRow key={egresso.id} egresso={egresso} index={i} />
      ))}
    </div>
  )
}
