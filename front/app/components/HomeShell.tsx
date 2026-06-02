'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppSidebar from './AppSidebar'
import PublicQuickCreateMenu from './PublicQuickCreateMenu'
import { PublicHeaderAuth } from './PublicAuthControls'
import SearchBar from './SearchBar'
import ThemeToggle from './ThemeToggle'
import NotificationBell from './NotificationBell'
import { supabase } from '@/app/lib/supabase'

function NotificationBellWrapper() {
  const [userId, setUserId] = useState<string | null>(null)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])
  return <NotificationBell userId={userId} />
}

export default function HomeShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col ml-0 md:ml-56">
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-end gap-2 border-b border-zinc-100 bg-white px-3 sm:gap-4 sm:px-4 md:px-6">
          <div className="mr-auto flex shrink-0 items-center gap-1 md:hidden">
            <button
              type="button"
              aria-label="Abrir menu"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100"
            >
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1={3} y1={6} x2={21} y2={6} />
                <line x1={3} y1={12} x2={21} y2={12} />
                <line x1={3} y1={18} x2={21} y2={18} />
              </svg>
            </button>
            <Link
              href="/"
              aria-label="Ir para inicio"
              className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100"
            >
              <HomeIcon />
            </Link>
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 md:gap-4">
            <SearchBar />
            <div className="hidden md:block">
              <ThemeToggle />
            </div>
            <NotificationBellWrapper />
            <PublicHeaderAuth />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-white">
          {children}
        </main>

        <PublicQuickCreateMenu />
      </div>
    </div>
  )
}

function HomeIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  )
}
