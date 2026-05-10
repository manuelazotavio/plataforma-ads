'use client'

import { useState } from 'react'
import AppSidebar from './AppSidebar'
import PublicQuickCreateMenu from './PublicQuickCreateMenu'
import { PublicHeaderAuth } from './PublicAuthControls'
import SearchBar from './SearchBar'
import ThemeToggle from './ThemeToggle'

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
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-end gap-4 border-b border-zinc-100 bg-white px-4 md:px-6">
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 transition shrink-0 mr-auto"
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1={3} y1={6} x2={21} y2={6} />
              <line x1={3} y1={12} x2={21} y2={12} />
              <line x1={3} y1={18} x2={21} y2={18} />
            </svg>
          </button>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-3 md:gap-4">
            <SearchBar />
            <ThemeToggle />
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
