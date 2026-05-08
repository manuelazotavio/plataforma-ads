import type { User } from '@supabase/supabase-js'
import { supabase } from '@/app/lib/supabase'

let pendingAuthUser: Promise<User | null> | null = null

function isLockError(error: unknown) {
  return error instanceof Error && error.message.includes('auth-token')
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function readAuthUser() {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    } catch (error) {
      if (!isLockError(error) || attempt === 2) throw error
      await wait(80 * (attempt + 1))
    }
  }

  return null
}

export function getAuthUser() {
  if (!pendingAuthUser) {
    pendingAuthUser = readAuthUser().finally(() => {
      pendingAuthUser = null
    })
  }

  return pendingAuthUser
}
