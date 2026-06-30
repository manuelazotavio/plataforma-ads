type CountdownFrameProps = {
  src: string
}

type CropSettings = {
  cropX: number
  cropY: number
  cropH: number
  cropScale: number
  frameH: number
}

const CROP_PARAM_KEYS = [
  'cropX',
  'cropY',
  'cropH',
  'cropScale',
  'frameH',
  'mCropX',
  'mCropY',
  'mCropH',
  'mCropScale',
  'mFrameH',
]

function numberParam(params: URLSearchParams, key: string, fallback: number) {
  const value = Number(params.get(key) ?? fallback)
  return Number.isFinite(value) ? value : fallback
}

function positiveNumberParam(params: URLSearchParams, key: string, fallback: number) {
  const value = numberParam(params, key, fallback)
  return value > 0 ? value : fallback
}

function CountdownCrop({ src, settings, className = '' }: { src: string; settings: CropSettings; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50 ${className}`}
      style={{ height: settings.cropH }}
    >
      <iframe
        src={src}
        title="Contagem regressiva do evento"
        className="pointer-events-none absolute left-0 top-0 border-0"
        loading="lazy"
        scrolling="no"
        sandbox="allow-scripts allow-same-origin"
        style={{
          width: `${100 / settings.cropScale}%`,
          height: settings.frameH,
          transform: `translate(${-settings.cropX}px, ${-settings.cropY}px) scale(${settings.cropScale})`,
          transformOrigin: 'top left',
          overflow: 'hidden',
        }}
      />
    </div>
  )
}

function parseCropUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl)
    const desktop: CropSettings = {
      cropX: numberParam(parsed.searchParams, 'cropX', 0),
      cropY: numberParam(parsed.searchParams, 'cropY', 0),
      cropH: numberParam(parsed.searchParams, 'cropH', 190),
      cropScale: positiveNumberParam(parsed.searchParams, 'cropScale', 1),
      frameH: numberParam(parsed.searchParams, 'frameH', 720),
    }
    const mobile: CropSettings = {
      cropX: numberParam(parsed.searchParams, 'mCropX', desktop.cropX),
      cropY: numberParam(parsed.searchParams, 'mCropY', desktop.cropY),
      cropH: numberParam(parsed.searchParams, 'mCropH', desktop.cropH),
      cropScale: positiveNumberParam(parsed.searchParams, 'mCropScale', desktop.cropScale),
      frameH: numberParam(parsed.searchParams, 'mFrameH', desktop.frameH),
    }

    for (const key of CROP_PARAM_KEYS) parsed.searchParams.delete(key)

    return {
      iframeSrc: parsed.toString(),
      desktop,
      mobile,
    }
  } catch {
    return {
      iframeSrc: rawUrl,
      desktop: { cropX: 0, cropY: 0, cropH: 190, cropScale: 1, frameH: 720 },
      mobile: { cropX: 0, cropY: 0, cropH: 190, cropScale: 1, frameH: 720 },
    }
  }
}

export default function CountdownFrame({ src }: CountdownFrameProps) {
  const { iframeSrc, desktop, mobile } = parseCropUrl(src)

  return (
    <>
      <CountdownCrop src={iframeSrc} settings={mobile} className="md:hidden" />
      <CountdownCrop src={iframeSrc} settings={desktop} className="hidden md:block" />
    </>
  )
}
