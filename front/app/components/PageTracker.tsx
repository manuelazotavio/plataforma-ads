'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { getAuthUser } from '@/app/lib/auth'

export default function PageTracker() {
  const pathname = usePathname()
  const lastTracked = useRef<string | null>(null)

  useEffect(() => {
    if (lastTracked.current === pathname) return
    lastTracked.current = pathname

    if (pathname.startsWith('/admin') || pathname.startsWith('/api')) return

    getAuthUser()
      .then(user => {
        fetch('/api/track-visit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: pathname, user_id: user?.id ?? null }),
        }).catch(() => {})
      })
      .catch(() => {})
  }, [pathname])

  return null
}
