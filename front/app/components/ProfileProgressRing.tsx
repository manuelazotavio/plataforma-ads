type Props = {
  progress: number   // 0–1
  avatarSize: number // avatar px (e.g. 36, 80)
  children: React.ReactNode
}

const STROKE = 2
const GAP = 2

export default function ProfileProgressRing({ progress, avatarSize, children }: Props) {
  const svgSize = avatarSize + 2 * GAP + 2 * STROKE
  const cx = svgSize / 2
  const r = avatarSize / 2 + GAP + STROKE / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(1, Math.max(0, progress)))
  const inset = GAP + STROKE

  return (
    <div className="relative shrink-0" style={{ width: svgSize, height: svgSize }}>
      <svg
        width={svgSize}
        height={svgSize}
        className="absolute inset-0 -rotate-90 pointer-events-none"
      >
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#e4e4e7" strokeWidth={STROKE} />
        <circle
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke="#2F9E41"
          strokeWidth={STROKE}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex items-center justify-center" style={{ inset }}>
        {children}
      </div>
    </div>
  )
}
