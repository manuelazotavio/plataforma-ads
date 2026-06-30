type CountdownFrameProps = {
  src: string
}

const CROP_PARAM_KEYS = ['cropX', 'cropY', 'cropH', 'cropScale', 'frameH']

function parseCropUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl)
    const cropX = Number(parsed.searchParams.get('cropX') ?? 0)
    const cropY = Number(parsed.searchParams.get('cropY') ?? 0)
    const cropH = Number(parsed.searchParams.get('cropH') ?? 190)
    const cropScale = Number(parsed.searchParams.get('cropScale') ?? 1)
    const frameH = Number(parsed.searchParams.get('frameH') ?? 720)

    for (const key of CROP_PARAM_KEYS) parsed.searchParams.delete(key)

    return {
      iframeSrc: parsed.toString(),
      cropX: Number.isFinite(cropX) ? cropX : 0,
      cropY: Number.isFinite(cropY) ? cropY : 0,
      cropH: Number.isFinite(cropH) ? cropH : 190,
      cropScale: Number.isFinite(cropScale) && cropScale > 0 ? cropScale : 1,
      frameH: Number.isFinite(frameH) ? frameH : 720,
    }
  } catch {
    return {
      iframeSrc: rawUrl,
      cropX: 0,
      cropY: 0,
      cropH: 190,
      cropScale: 1,
      frameH: 720,
    }
  }
}

export default function CountdownFrame({ src }: CountdownFrameProps) {
  const { iframeSrc, cropX, cropY, cropH, cropScale, frameH } = parseCropUrl(src)

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50"
      style={{ height: cropH }}
    >
      <iframe
        src={iframeSrc}
        title="Contagem regressiva do evento"
        className="absolute left-0 top-0 border-0"
        loading="lazy"
        sandbox="allow-scripts allow-same-origin"
        style={{
          width: `${100 / cropScale}%`,
          height: frameH,
          transform: `translate(${-cropX}px, ${-cropY}px) scale(${cropScale})`,
          transformOrigin: 'top left',
        }}
      />
    </div>
  )
}
