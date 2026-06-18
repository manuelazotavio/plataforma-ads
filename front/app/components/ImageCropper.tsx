'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type CropAspect = 'free' | '1:1' | '4:3' | '3:2' | '16:9'

const ASPECTS: { value: CropAspect; label: string; ratio: number | null }[] = [
  { value: 'free', label: 'Livre', ratio: null },
  { value: '1:1', label: '1:1', ratio: 1 },
  { value: '4:3', label: '4:3', ratio: 4 / 3 },
  { value: '3:2', label: '3:2', ratio: 3 / 2 },
  { value: '16:9', label: '16:9', ratio: 16 / 9 },
]

type PendingCrop = {
  file: File
  url: string
  defaultAspect: CropAspect
  lockedAspect: boolean
  resolve: (file: File | null) => void
}

export function useImageCropper(defaultAspect: CropAspect = 'free', lockedAspect = false) {
  const [pending, setPending] = useState<PendingCrop | null>(null)
  const queueRef = useRef(Promise.resolve())

  const cropImage = useCallback((file: File, aspect = defaultAspect) => {
    if (!file.type.startsWith('image/')) return Promise.resolve(file)

    let resolveCrop!: (file: File | null) => void
    const result = new Promise<File | null>((resolve) => { resolveCrop = resolve })
    queueRef.current = queueRef.current.then(() => new Promise<void>((done) => {
      const url = URL.createObjectURL(file)
      setPending({
        file,
        url,
        defaultAspect: aspect,
        lockedAspect,
        resolve: (cropped) => {
          resolveCrop(cropped)
          done()
        },
      })
    }))
    return result
  }, [defaultAspect, lockedAspect])

  const close = useCallback((file: File | null) => {
    setPending((current) => {
      if (current) {
        URL.revokeObjectURL(current.url)
        current.resolve(file)
      }
      return null
    })
  }, [])

  return {
    cropImage,
    cropperNode: pending ? <ImageCropperDialog pending={pending} onClose={close} /> : null,
  }
}

function ImageCropperDialog({
  pending,
  onClose,
}: {
  pending: PendingCrop
  onClose: (file: File | null) => void
}) {
  const imageRef = useRef<HTMLImageElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null)
  const [aspect, setAspect] = useState<CropAspect>(pending.defaultAspect)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 })
  const [viewportSize, setViewportSize] = useState({ width: 1, height: 1 })
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState(false)

  const selected = ASPECTS.find((item) => item.value === aspect) ?? ASPECTS[0]
  const ratio = selected.ratio ?? imageSize.width / imageSize.height
  const circularMask = pending.lockedAspect && aspect === '1:1'

  useEffect(() => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }, [aspect])

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const observer = new ResizeObserver(([entry]) => {
      setViewportSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [ratio])

  const baseScale = Math.max(viewportSize.width / imageSize.width, viewportSize.height / imageSize.height)
  const renderedScale = baseScale * zoom

  function clampOffset(next: { x: number; y: number }) {
    const maxX = Math.max(0, (imageSize.width * renderedScale - viewportSize.width) / 2)
    const maxY = Math.max(0, (imageSize.height * renderedScale - viewportSize.height) / 2)
    return {
      x: Math.max(-maxX, Math.min(maxX, next.x)),
      y: Math.max(-maxY, Math.min(maxY, next.y)),
    }
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { x: event.clientX, y: event.clientY, startX: offset.x, startY: offset.y }
    setDragging(true)
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return
    event.preventDefault()
    setOffset(clampOffset({
      x: dragRef.current.startX + event.clientX - dragRef.current.x,
      y: dragRef.current.startY + event.clientY - dragRef.current.y,
    }))
  }

  function onPointerUp() {
    dragRef.current = null
    setDragging(false)
  }

  async function applyCrop() {
    const image = imageRef.current
    const viewport = viewportRef.current
    if (!image || !viewport) return

    setSaving(true)
    const viewportRect = viewport.getBoundingClientRect()
    const outputBaseScale = Math.max(viewportRect.width / imageSize.width, viewportRect.height / imageSize.height)
    const outputRenderedScale = outputBaseScale * zoom
    const renderedWidth = imageSize.width * outputRenderedScale
    const renderedHeight = imageSize.height * outputRenderedScale
    const imageLeft = (viewportRect.width - renderedWidth) / 2 + offset.x
    const imageTop = (viewportRect.height - renderedHeight) / 2 + offset.y

    const sourceCenterX = (viewportRect.width / 2 - imageLeft) / outputRenderedScale
    const sourceCenterY = (viewportRect.height / 2 - imageTop) / outputRenderedScale
    let sourceWidth = viewportRect.width / outputRenderedScale
    let sourceHeight = viewportRect.height / outputRenderedScale

    if (selected.ratio) {
      sourceHeight = sourceWidth / selected.ratio
      if (sourceHeight > imageSize.height) {
        sourceHeight = imageSize.height
        sourceWidth = sourceHeight * selected.ratio
      }
    }

    const sourceX = Math.max(0, Math.min(imageSize.width - sourceWidth, sourceCenterX - sourceWidth / 2))
    const sourceY = Math.max(0, Math.min(imageSize.height - sourceHeight, sourceCenterY - sourceHeight / 2))
    const maxOutput = 2400
    const outputScale = Math.min(1, maxOutput / Math.max(sourceWidth, sourceHeight))
    const canvas = document.createElement('canvas')
    if (selected.ratio) {
      canvas.width = Math.max(1, Math.round(sourceWidth * outputScale))
      canvas.height = Math.max(1, Math.round(canvas.width / selected.ratio))
    } else {
      canvas.width = Math.max(1, Math.round(sourceWidth * outputScale))
      canvas.height = Math.max(1, Math.round(sourceHeight * outputScale))
    }
    const context = canvas.getContext('2d')
    if (!context) { setSaving(false); return }

    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    )

    const isPng = pending.file.type === 'image/png'
    const mimeType = isPng ? 'image/png' : 'image/webp'
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, 0.92))
    if (!blob) { setSaving(false); return }

    const baseName = pending.file.name.replace(/\.[^.]+$/, '')
    const extension = isPng ? 'png' : 'webp'
    onClose(new File([blob], `${baseName}-crop.${extension}`, { type: mimeType, lastModified: Date.now() }))
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Recortar imagem"
      onKeyDown={(event) => { if (event.key === 'Escape') onClose(null) }}
    >
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Ajustar imagem</h2>
            <p className="text-xs text-zinc-500">Arraste para reposicionar e use o controle de zoom.</p>
          </div>
          <button
            type="button"
            onClick={() => onClose(null)}
            className="grid h-9 w-9 place-items-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Fechar"
            title="Fechar"
          >
            <span aria-hidden="true" className="text-xl leading-none">×</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <div
            ref={viewportRef}
            className={`relative mx-auto select-none overflow-hidden bg-zinc-950 ${
              dragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            style={{
              aspectRatio: `${ratio}`,
              touchAction: 'none',
              width: `min(100%, ${ratio * 50}vh)`,
              maxWidth: ratio <= 1 ? 400 : 580,
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onLostPointerCapture={onPointerUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imageRef}
              src={pending.url}
              alt=""
              draggable={false}
              onLoad={(event) => setImageSize({
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
              })}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
              style={{
                width: imageSize.width,
                height: imageSize.height,
                left: `calc(50% + ${offset.x}px)`,
                top: `calc(50% + ${offset.y}px)`,
                transform: `translate(-50%, -50%) scale(${renderedScale})`,
              }}
            />
            {circularMask ? (
              <div
                className="pointer-events-none absolute inset-2 rounded-full border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.48)]"
                aria-hidden="true"
              />
            ) : (
              <>
                <div className="pointer-events-none absolute inset-0 border border-white/70" />
                <div className="pointer-events-none absolute inset-y-0 left-1/3 border-l border-white/25" />
                <div className="pointer-events-none absolute inset-y-0 left-2/3 border-l border-white/25" />
                <div className="pointer-events-none absolute inset-x-0 top-1/3 border-t border-white/25" />
                <div className="pointer-events-none absolute inset-x-0 top-2/3 border-t border-white/25" />
              </>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-4">
            {pending.lockedAspect ? (
              <p className="text-xs font-medium text-zinc-500">
                {circularMask ? 'Foto de perfil: recorte circular 1:1' : `Proporção fixa: ${selected.label}`}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2" aria-label="Proporção do recorte">
                {ASPECTS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setAspect(item.value)}
                    className={`min-w-14 rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                      aspect === item.value
                        ? 'border-[#2F9E41] bg-green-50 text-[#237A32]'
                        : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            <label className="flex items-center gap-3 text-xs font-medium text-zinc-600">
              <span>Zoom</span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(event) => {
                  setZoom(Number(event.target.value))
                  setOffset({ x: 0, y: 0 })
                }}
                className="min-w-0 flex-1 accent-[#2F9E41]"
              />
              <span className="w-10 text-right tabular-nums">{Math.round(zoom * 100)}%</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-200 px-4 py-3">
          <button
            type="button"
            onClick={() => onClose(null)}
            className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void applyCrop()}
            disabled={saving}
            className="rounded-md bg-[#2F9E41] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#278737] disabled:opacity-50"
          >
            {saving ? 'Aplicando...' : 'Aplicar recorte'}
          </button>
        </div>
      </div>
    </div>
  )
}
