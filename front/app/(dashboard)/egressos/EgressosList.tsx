'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

type Egresso = {
  id: string
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
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="grid grid-cols-[auto_1fr_auto] gap-6 items-center py-6 border-b border-zinc-100 last:border-0 cursor-default"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
        transitionDelay: `${index * 60}ms`,
      }}
    >
      
      <div className="relative w-12 h-12 rounded-full overflow-hidden bg-zinc-100 shrink-0">
        {egresso.avatar_url ? (
          <Image
            src={egresso.avatar_url}
            alt={egresso.name}
            fill
            className="object-cover"
            style={{
              transform: hovered ? 'scale(1.08)' : 'scale(1)',
              transition: 'transform 0.4s ease',
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-lg font-black text-zinc-300">
            {egresso.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      
      <div className="min-w-0 flex flex-col gap-0.5">
        <p
          className="text-base font-black leading-tight transition-colors duration-300"
          style={{ color: hovered ? '#0B7A3B' : '#18181b' }}
        >
          {egresso.name}
        </p>
        {(egresso.role || egresso.company) && (
          <p
            className="text-sm leading-snug transition-colors duration-300"
            style={{ color: hovered ? '#52525b' : '#a1a1aa' }}
          >
            {egresso.role}{egresso.role && egresso.company ? ' · ' : ''}{egresso.company}
          </p>
        )}
        {egresso.bio && (
          <p
            className="text-xs text-zinc-400 line-clamp-1 mt-0.5 transition-opacity duration-300"
            style={{ opacity: hovered ? 1 : 0, maxHeight: hovered ? '20px' : '0px', overflow: 'hidden', transition: 'opacity 0.3s ease, max-height 0.3s ease' }}
          >
            {egresso.bio}
          </p>
        )}
      </div>

     
      <div className="flex items-center gap-4 shrink-0">
        {egresso.graduation_year && (
          <span className="text-xs text-zinc-300 font-semibold tabular-nums">
            {egresso.graduation_year}
          </span>
        )}
        {egresso.linkedin && (
          <a
            href={egresso.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold transition-colors duration-300"
            style={{ color: hovered ? '#0B7A3B' : '#d4d4d8' }}
            onClick={(e) => e.stopPropagation()}
          >
            LinkedIn ↗
          </a>
        )}
      </div>
    </div>
  )
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
