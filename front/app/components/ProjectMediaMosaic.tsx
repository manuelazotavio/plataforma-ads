'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

export type ProjectMedia = {
  image_url: string
  media_type?: string | null
}

type Props = {
  items: ProjectMedia[]
  title: string
}

export default function ProjectMediaMosaic({ items, title }: Props) {
  const [open, setOpen] = useState(false)
  const visible = items.slice(0, 3)
  const hiddenCount = Math.max(items.length - 3, 0)

  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  if (items.length === 0) return null

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm">
        <div className={items.length === 1 ? 'relative aspect-video overflow-hidden rounded-xl bg-zinc-100' : items.length === 2 ? 'grid aspect-[2.1/1] grid-cols-2 gap-2' : 'grid aspect-[2.1/1] grid-cols-[1.45fr_1fr] gap-2'}>
          {items.length === 1 ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="group relative h-full w-full overflow-hidden rounded-xl bg-zinc-100 text-left"
            >
              <MediaTile media={visible[0]} title={title} index={1} />
              <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
                {isVideoMedia(visible[0]) ? 'Abrir player' : 'Ver galeria'}
              </span>
            </button>
          ) : items.length === 2 ? (
            visible.map((item, index) => (
              <button
                key={`${item.image_url}-${index}`}
                type="button"
                onClick={() => setOpen(true)}
                className="relative min-h-0 overflow-hidden rounded-xl bg-zinc-100 text-left"
              >
                <MediaTile media={item} title={title} index={index + 1} />
              </button>
            ))
          ) : (
            <>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="relative min-h-0 overflow-hidden rounded-xl bg-zinc-100 text-left"
              >
                <MediaTile media={visible[0]} title={title} index={1} />
              </button>
              <div className="grid min-h-0 gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="relative min-h-0 overflow-hidden rounded-xl bg-zinc-100 text-left"
                >
                  <MediaTile media={visible[1]} title={title} index={2} />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="group relative min-h-0 overflow-hidden rounded-xl bg-zinc-100 text-left"
                >
                  <MediaTile media={visible[2] ?? visible[1]} title={title} index={3} dimmed={hiddenCount > 0} />
                  {hiddenCount > 0 && (
                    <span className="absolute inset-0 grid place-items-center bg-black/45 text-sm font-semibold text-white transition group-hover:bg-black/55">
                      Ver +{hiddenCount}
                    </span>
                  )}
                  {hiddenCount === 0 && (
                    <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
                      Ver galeria
                    </span>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-black/75 sm:items-center sm:justify-center sm:px-4 sm:py-6" role="dialog" aria-modal="true">
          <div className="flex w-full flex-col overflow-hidden bg-white sm:max-h-[88vh] sm:max-w-5xl sm:rounded-2xl sm:shadow-2xl" style={{ height: '100%' }}>
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-4 py-3">
              <p className="text-sm font-semibold text-zinc-900">Galeria do projeto</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="Fechar galeria"
              >
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {items.map((item, index) => (
                  <div key={`${item.image_url}-${index}`} className="relative aspect-video overflow-hidden rounded-xl bg-zinc-100">
                    <MediaTile media={item} title={title} index={index + 1} controls />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function MediaTile({ media, title, index, dimmed, controls }: { media: ProjectMedia; title: string; index: number; dimmed?: boolean; controls?: boolean }) {
  const isVideo = isVideoMedia(media)

  if (isVideo) {
    return (
      <video
        src={media.image_url}
        className={`h-full w-full ${controls ? 'object-contain bg-black' : 'object-cover'} ${dimmed ? 'opacity-80' : ''}`}
        controls={controls}
        autoPlay
        muted={!controls}
        loop={!controls}
        playsInline
      />
    )
  }

  return (
    <Image
      src={media.image_url}
      alt={`${title} imagem ${index}`}
      fill
      className={`object-cover ${dimmed ? 'opacity-80' : ''}`}
      sizes="(max-width: 768px) 100vw, 720px"
    />
  )
}

function isVideoMedia(media: ProjectMedia) {
  if (media.media_type === 'video') return true
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(media.image_url)
}
