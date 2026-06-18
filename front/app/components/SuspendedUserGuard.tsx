'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

const SUSPENSION_CHECK_INTERVAL_MS = 10_000

export default function SuspendedUserGuard() {
  const pathname = usePathname()

  useEffect(() => {
    let active = true
    let checking = false

    async function checkSuspension() {
      if (!active || checking) return
      checking = true

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!active || !user) return

        const { data: profile } = await supabase
          .from('users')
          .select('suspended')
          .eq('id', user.id)
          .maybeSingle()

        if (!active || !profile?.suspended) return

        active = false
        await supabase.auth.signOut()
        window.location.replace('/login?suspended=1')
      } catch {
        return
      } finally {
        checking = false
      }
    }

    function checkWhenVisible() {
      if (document.visibilityState === 'visible') void checkSuspension()
    }

    void checkSuspension()
    const interval = window.setInterval(() => void checkSuspension(), SUSPENSION_CHECK_INTERVAL_MS)
    window.addEventListener('focus', checkSuspension)
    document.addEventListener('visibilitychange', checkWhenVisible)

    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener('focus', checkSuspension)
      document.removeEventListener('visibilitychange', checkWhenVisible)
    }
  }, [pathname])

  return null
}
