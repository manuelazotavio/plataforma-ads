import Image from 'next/image'

export type UserMascot = {
  name: string
  image_url: string
} | { name: string; image_url: string }[] | null

export default function UserMascotBadge({
  mascot,
  size = 20,
  showName = false,
}: {
  mascot: UserMascot
  size?: number
  showName?: boolean
}) {
  const selected = Array.isArray(mascot) ? mascot[0] : mascot
  if (!selected?.image_url) return null

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 align-middle"
      title={selected.name}
      aria-label={`Personagem escolhido: ${selected.name}`}
    >
      <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
        <Image
          src={selected.image_url}
          alt=""
          fill
          className="object-contain drop-shadow-sm"
          sizes={`${size}px`}
        />
      </span>
      {showName && (
        <span className="max-w-24 truncate text-[11px] font-semibold text-[#2F9E41]">
          {selected.name}
        </span>
      )}
    </span>
  )
}
