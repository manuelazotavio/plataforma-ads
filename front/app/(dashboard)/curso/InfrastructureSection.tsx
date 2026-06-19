'use client'

import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'

type InfraItem = {
  title: string
  description: string
  tags: string[]
  images: string[]
}

const AUTOPLAY_DELAY = 4500

function ImageCarousel({ images, title }: { images: string[]; title: string }) {
  const [activeImage, setActiveImage] = useState(0)
  const [paused, setPaused] = useState(false)

  const goTo = useCallback((index: number) => {
    setActiveImage((index + images.length) % images.length)
  }, [images.length])

  useEffect(() => {
    if (paused || images.length < 2) return
    const interval = window.setInterval(() => {
      setActiveImage((current) => (current + 1) % images.length)
    }, AUTOPLAY_DELAY)
    return () => window.clearInterval(interval)
  }, [images.length, paused])

  if (images.length === 0) {
    return (
      <div className="flex min-h-64 items-center justify-center bg-zinc-100 md:min-h-96">
        <div className="flex flex-col items-center gap-3 text-zinc-400">
          <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <rect x={3} y={3} width={18} height={18} rx={2} />
            <circle cx={8.5} cy={8.5} r={1.5} />
            <path d="m21 15-5-5L5 21" />
          </svg>
          <span className="text-sm">Galeria em atualização</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="group relative min-h-64 overflow-hidden bg-zinc-100 md:min-h-96"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {images.map((image, index) => (
        <Image
          key={`${title}-${image}`}
          src={image}
          alt={`${title} — foto ${index + 1}`}
          fill
          priority={index === 0}
          className={`object-cover transition duration-700 ease-out ${
            index === activeImage ? 'scale-100 opacity-100' : 'scale-105 opacity-0'
          }`}
        />
      ))}

      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(activeImage - 1)}
            className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-zinc-800 shadow-sm transition hover:bg-white dark:bg-zinc-900/90 dark:text-white dark:hover:bg-zinc-900"
            aria-label="Foto anterior"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => goTo(activeImage + 1)}
            className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-zinc-800 shadow-sm transition hover:bg-white dark:bg-zinc-900/90 dark:text-white dark:hover:bg-zinc-900"
            aria-label="Próxima foto"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>

          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {images.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => goTo(index)}
                className={`h-2 rounded-full transition-all ${
                  index === activeImage ? 'w-7 bg-white' : 'w-2 bg-white/55 hover:bg-white/80'
                }`}
                aria-label={`Abrir foto ${index + 1}`}
                aria-current={index === activeImage ? 'true' : undefined}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function InfrastructureSection({ infrastructure }: { infrastructure: InfraItem[] }) {
  const [activeTab, setActiveTab] = useState(0)
  const activeItem = infrastructure[activeTab] ?? infrastructure[0]

  if (!activeItem) return null

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div
        className="flex gap-2 overflow-x-auto border-b border-zinc-200 p-3"
        role="tablist"
        aria-label="Infraestrutura do câmpus"
      >
        {infrastructure.map((item, index) => (
          <button
            key={item.title}
            type="button"
            role="tab"
            aria-selected={activeTab === index}
            onClick={() => setActiveTab(index)}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === index
                ? 'bg-[#2F9E41] text-white shadow-sm'
                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            {item.title}
          </button>
        ))}
      </div>

      <div key={activeItem.title} role="tabpanel" className="grid grid-cols-1 lg:grid-cols-[minmax(0,4fr)_minmax(320px,3fr)]">
        <ImageCarousel images={activeItem.images} title={activeItem.title} />

        <div className="flex flex-col justify-center gap-5 p-6 md:p-9">
          <h3 className="text-2xl font-black leading-tight text-zinc-900">
            {activeItem.title}
          </h3>

          <p className="text-sm leading-7 text-zinc-600">{activeItem.description}</p>

          <div className="flex flex-wrap gap-2">
            {activeItem.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[#2F9E41]/20 bg-[#2F9E41]/5 px-3 py-1.5 text-xs font-medium text-[#277F35]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
