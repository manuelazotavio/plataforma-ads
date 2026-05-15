'use client'

import { useState } from 'react'

type Props = {
  title: string
  label?: string
  className?: string
}

export default function ShareProjectButton({ title, label = 'Compartilhar projeto', className = '' }: Props) {
  const [copied, setCopied] = useState(false)

  async function share() {
    const url = window.location.href

    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        // User cancellation should fall through silently to the copy fallback.
      }
    }

    await navigator.clipboard.writeText(url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <button
      type="button"
      onClick={share}
      className={`inline-flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-base font-semibold text-zinc-900 transition hover:bg-zinc-50 ${className}`}
    >
      <ShareIcon />
      {copied ? 'Link copiado' : label}
    </button>
  )
}

function ShareIcon() {
  return (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={18} cy={5} r={3} />
      <circle cx={6} cy={12} r={3} />
      <circle cx={18} cy={19} r={3} />
      <path d="m8.59 13.51 6.83 3.98" />
      <path d="m15.41 6.51-6.82 3.98" />
    </svg>
  )
}
