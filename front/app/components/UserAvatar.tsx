import Image from 'next/image'
import type { CSSProperties } from 'react'

type UserAvatarProps = {
  src?: string | null
  name?: string | null
  className?: string
  sizes?: string
  style?: CSSProperties
}

export default function UserAvatar({
  src,
  name,
  className = 'h-9 w-9',
  sizes = '36px',
  style,
}: UserAvatarProps) {
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-full bg-zinc-100 ${className}`} style={style}>
      <Image
        src={src || '/Portrait_Placeholder.png'}
        alt={name ? `Foto de ${name}` : 'Avatar'}
        fill
        sizes={sizes}
        className="object-cover"
      />
    </div>
  )
}
