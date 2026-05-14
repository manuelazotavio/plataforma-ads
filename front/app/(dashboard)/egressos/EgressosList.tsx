'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import UserAvatar from '@/app/components/UserAvatar'

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

function EgressoCard({ egresso, index }: { egresso: Egresso; index: number }) {
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
      className="flex flex-col rounded-2xl border border-zinc-100 bg-white p-5 hover:shadow-md transition-shadow"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease, box-shadow 0.2s ease',
        transitionDelay: `${index * 50}ms`,
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-zinc-100">
          {egresso.avatar_url ? (
            <Image
              src={egresso.avatar_url}
              alt={egresso.name}
              fill
              className="object-cover"
              style={{ transform: hovered ? 'scale(1.08)' : 'scale(1)', transition: 'transform 0.4s ease' }}
            />
          ) : (
            <UserAvatar name={egresso.name} className="h-14 w-14" sizes="56px" />
          )}
        </div>
        {egresso.graduation_year && (
          <span className="text-xs text-zinc-400 font-semibold tabular-nums mt-1">{egresso.graduation_year}</span>
        )}
      </div>

      <p
        className={`text-sm font-bold leading-tight transition-colors duration-300 ${hovered ? '' : 'text-zinc-900'}`}
        style={hovered ? { color: '#2F9E41' } : undefined}
      >
        {egresso.name}
      </p>

      {(egresso.role || egresso.company) && (
        <p className="text-xs text-zinc-400 leading-snug mt-1 truncate">
          {egresso.role}{egresso.role && egresso.company ? ' · ' : ''}{egresso.company}
        </p>
      )}

      {egresso.bio && (
        <p className="text-xs text-zinc-400 line-clamp-2 mt-2 flex-1">{egresso.bio}</p>
      )}

      {egresso.linkedin && (
        <p
          className="text-xs font-semibold mt-3 pt-3 border-t border-zinc-100 transition-colors duration-300"
          style={{ color: hovered ? '#2F9E41' : '#a1a1aa' }}
        >
          LinkedIn ↗
        </p>
      )}
    </div>
  )

  if (egresso.user_id) {
    return <Link href={`/usuarios/${egresso.user_id}`} className="block">{inner}</Link>
  }
  return inner
}

export default function EgressosList({ egressos }: { egressos: Egresso[] }) {
  const years = [...new Set(egressos.map((e) => e.graduation_year).filter(Boolean) as number[])]
    .sort((a, b) => b - a)
  const [selectedYear, setSelectedYear] = useState<number | null>(years[0] ?? null)
  const filtered = selectedYear
    ? egressos.filter((e) => e.graduation_year === selectedYear)
    : egressos.filter((e) => !e.graduation_year)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-3 text-sm font-semibold text-zinc-900">Selecione a turma</p>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {years.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => setSelectedYear(year)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                selectedYear === year
                  ? 'text-white'
                  : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700'
              }`}
              style={selectedYear === year ? { backgroundColor: '#2F9E41' } : undefined}
            >
              Turma {year}
            </button>
          ))}
          {egressos.some((e) => !e.graduation_year) && (
            <button
              type="button"
              onClick={() => setSelectedYear(null)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                selectedYear === null
                  ? 'text-white'
                  : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700'
              }`}
              style={selectedYear === null ? { backgroundColor: '#2F9E41' } : undefined}
            >
              Sem turma
            </button>
          )}
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-end justify-between gap-3 border-b border-zinc-100 pb-3">
          <h2 className="text-lg font-bold text-zinc-900">
            {selectedYear ? `Turma ${selectedYear}` : 'Sem turma'}
          </h2>
          <p className="text-sm text-zinc-400">
            {filtered.length} egresso{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filtered.map((egresso, i) => (
            <EgressoCard key={egresso.id} egresso={egresso} index={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
