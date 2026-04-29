'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

type InfraItem = {
  title: string
  description: string
  tags: string[]
  image?: string
}

function InfraRow({ item, index }: { item: InfraItem; index: number }) {
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
      className="grid grid-cols-[3fr_2fr] rounded-2xl overflow-hidden cursor-default"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(32px)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
        transitionDelay: `${index * 100}ms`,
      }}
    >
      {/* Coluna de texto */}
      <div className="py-9 pr-12 flex flex-col gap-4">
        <p
          className="text-2xl font-black leading-tight"
          style={{
            color: hovered ? '#0B7A3B' : '#18181b',
            letterSpacing: hovered ? '0.01em' : '0em',
            transition: 'color 0.4s ease, letter-spacing 0.4s ease',
          }}
        >
          {item.title}
        </p>

        <p
          className="text-sm leading-relaxed"
          style={{
            color: hovered ? '#52525b' : '#71717a',
            transform: hovered ? 'translateX(8px)' : 'translateX(0)',
            transition: 'color 0.4s ease, transform 0.4s ease',
          }}
        >
          {item.description}
        </p>

        <div className="flex flex-wrap gap-2">
          {item.tags.map((tag, t) => (
            <span
              key={tag}
              className="text-xs border rounded-full px-3 py-1"
              style={{
                color: hovered ? '#0B7A3B' : '#71717a',
                borderColor: hovered ? '#0B7A3B' : '#e4e4e7',
                transform: hovered ? 'translateY(0)' : 'translateY(4px)',
                opacity: hovered ? 1 : 0.7,
                transition: 'color 0.3s ease, border-color 0.3s ease, transform 0.3s ease, opacity 0.3s ease',
                transitionDelay: hovered ? `${t * 50}ms` : '0ms',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Coluna de imagem */}
      <div className="relative overflow-hidden min-h-[200px] bg-zinc-100">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.title}
            fill
            className="object-cover"
            style={{
              transform: hovered ? 'scale(1.06)' : 'scale(1)',
              transition: 'transform 0.6s cubic-bezier(0.76, 0, 0.24, 1)',
            }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              transform: hovered ? 'scale(1.03)' : 'scale(1)',
              transition: 'transform 0.6s cubic-bezier(0.76, 0, 0.24, 1)',
            }}
          >
            <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#d4d4d8" strokeWidth={1.5}>
              <rect x={3} y={3} width={18} height={18} rx={2} />
              <circle cx={8.5} cy={8.5} r={1.5} />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}

export default function InfrastructureSection({ infrastructure }: { infrastructure: InfraItem[] }) {
  return (
    <div className="flex flex-col gap-4">
      {infrastructure.map((item, i) => (
        <InfraRow key={item.title} item={item} index={i} />
      ))}
    </div>
  )
}
