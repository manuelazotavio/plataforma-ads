'use client'

import Image from 'next/image'
import { useState } from 'react'

type Professor = {
  id: string
  name: string
  avatar_url: string | null
  cargo: string | null
  email: string | null
  whatsapp: string | null
  linkedin: string | null
  cnpq: string | null
}

function ProfessorCard({ prof }: { prof: Professor }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative shrink-0 w-52 h-72 rounded-2xl overflow-hidden cursor-default bg-zinc-100"
    >
      
      {prof.avatar_url ? (
        <Image
          src={prof.avatar_url}
          alt={prof.name}
          fill
          className="object-cover"
          style={{
            transform: hovered ? 'scale(1.06)' : 'scale(1)',
            transition: 'transform 0.6s cubic-bezier(0.76, 0, 0.24, 1)',
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-5xl font-black text-zinc-300">
          {prof.name.charAt(0).toUpperCase()}
        </div>
      )}

      
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col gap-1 px-5 py-5"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)',
          transform: hovered ? 'translateY(0)' : 'translateY(30%)',
          opacity: hovered ? 1 : 0,
          transition: 'transform 0.4s cubic-bezier(0.76, 0, 0.24, 1), opacity 0.4s ease',
        }}
      >
        <p className="text-white font-bold text-base leading-tight">{prof.name}</p>
        {prof.cargo && (
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#4ade80' }}>
            {prof.cargo}
          </p>
        )}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {prof.whatsapp && (
            <a
              href={`https://wa.me/${prof.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-white/70 hover:text-white transition"
              onClick={(e) => e.stopPropagation()}
            >
              WhatsApp ↗
            </a>
          )}
          {prof.linkedin && (
            <a
              href={prof.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-white/70 hover:text-white transition"
              onClick={(e) => e.stopPropagation()}
            >
              LinkedIn ↗
            </a>
          )}
          {prof.cnpq && (
            <a
              href={prof.cnpq}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-white/70 hover:text-white transition"
              onClick={(e) => e.stopPropagation()}
            >
              CNPq ↗
            </a>
          )}
          {prof.email && (
            <a
              href={`mailto:${prof.email}`}
              className="text-xs text-white/70 hover:text-white transition"
              onClick={(e) => e.stopPropagation()}
            >
              ✉ Email
            </a>
          )}
        </div>
      </div>

     
      <div
        className="absolute inset-x-0 bottom-0 px-5 py-4"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
          opacity: hovered ? 0 : 1,
          transition: 'opacity 0.3s ease',
        }}
      >
        <p className="text-white font-semibold text-sm leading-tight truncate">{prof.name}</p>
      </div>
    </div>
  )
}

export default function ProfessorsSection({ professors }: { professors: Professor[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 md:-mx-10 md:px-10" style={{ scrollbarWidth: 'none' }}>
      {professors.map((prof) => (
        <ProfessorCard key={prof.id} prof={prof} />
      ))}
    </div>
  )
}
