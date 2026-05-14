'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { getAuthUser } from '@/app/lib/auth'
import NotificationBell from '@/app/components/NotificationBell'
import SearchBar from '@/app/components/SearchBar'
import AppSidebar from '@/app/components/AppSidebar'
import ThemeToggle from '@/app/components/ThemeToggle'
import UserAvatar from '@/app/components/UserAvatar'

type UserProfile = {
  name: string
  avatar_url: string | null
  semester: number | null
  role: string | null
  suspended: boolean
  onboarding_completed: boolean
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadUser() {
      const authUser = await getAuthUser()
      if (!authUser) {
        if (isProtectedPath(pathname)) {
          router.replace('/login')
        }
        setLoading(false)
        return
      }
      setUserId(authUser.id)
      const { data: profile } = await supabase
        .from('users')
        .select('name, avatar_url, semester, role, suspended, onboarding_completed')
        .eq('id', authUser.id)
        .single()
      if (profile?.suspended) {
        await supabase.auth.signOut()
        router.replace('/login?suspended=1')
        return
      }
      if (profile && !profile.onboarding_completed) {
        router.replace('/onboarding')
        return
      }
      setUser(profile)
      setLoading(false)
    }
    loadUser()
  }, [pathname, router])

  useEffect(() => {
    void Promise.resolve().then(() => {
      setSidebarOpen(false)
      setUserMenuOpen(false)
    })
  }, [pathname])

  useEffect(() => {
    function close(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  if (loading) {
    return <div className="min-h-screen bg-white" />
  }

  return (
    <div className="flex h-screen overflow-hidden">

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 ml-0 md:ml-56 min-w-0">
        <header className="h-16 bg-white border-b border-zinc-100 flex items-center justify-end px-4 md:px-6 sticky top-0 z-10 shrink-0 gap-3 md:gap-4">

          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 transition shrink-0"
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


          <NotificationBell userId={userId} />

          {user ? (
            <div ref={userMenuRef} className="relative pl-3 md:pl-4 border-l border-zinc-100">
              <button
                type="button"
                onClick={() => setUserMenuOpen(v => !v)}
                className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-zinc-50 transition"
              >
                <div className="hidden md:block text-right leading-tight">
                  <p className="text-sm font-semibold text-zinc-900">{user.name}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {user.semester ? `${user.semester}º Semestre` : 'Aluno'}
                  </p>
                </div>
                <UserAvatar src={user.avatar_url} name={user.name} className="h-9 w-9 ring-2 ring-zinc-100" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-zinc-200 bg-white shadow-lg py-1 z-50">
                  <div className="py-1">
                    <Link href="/perfil" className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition">
                      <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 shrink-0"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx={12} cy={7} r={4}/></svg>
                      Meu perfil
                    </Link>
                    <Link href="/meus-projetos" className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition">
                      <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 shrink-0"><rect x={3} y={3} width={7} height={7}/><rect x={14} y={3} width={7} height={7}/><rect x={14} y={14} width={7} height={7}/><rect x={3} y={14} width={7} height={7}/></svg>
                      Meus projetos
                    </Link>
                    <Link href="/meus-artigos" className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition">
                      <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1={16} y1={13} x2={8} y2={13}/><line x1={16} y1={17} x2={8} y2={17}/><polyline points="10 9 9 9 8 9"/></svg>
                      Meus artigos
                    </Link>
                    {user?.role === 'admin' && (
                      <Link href="/admin" className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition">
                        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 shrink-0"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        Painel Admin
                      </Link>
                    )}
                  </div>
                  <div className="border-t border-zinc-100 py-1">
                    <button
                      type="button"
                      onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                    >
                      <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1={21} y1={12} x2={9} y2={12}/></svg>
                      Sair
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="pl-4 border-l border-zinc-100 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition"
            >
              Entrar
            </Link>
          )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-white">
          <div className="flex flex-col min-h-full">
            <div className="flex-1">
              {children}
            </div>
            <footer className="border-t border-zinc-100 py-6 mt-8 px-4 md:pl-10 md:pr-28">
              <div className="flex flex-col items-center gap-y-2 text-center text-xs text-zinc-400 md:flex-row md:flex-wrap md:text-left md:gap-x-5">
                <Link href="/regras" className="hover:text-zinc-700 transition">Regras do ADS Comunica</Link>
                <Link href="/privacidade" className="hover:text-zinc-700 transition">Política de Privacidade</Link>
                <Link href="/contrato" className="hover:text-zinc-700 transition">Contrato de Usuário</Link>
                <Link href="/acessibilidade" className="hover:text-zinc-700 transition">Acessibilidade</Link>
                <span className="md:ml-auto">ADS Comunica, Inc. © 2026. Todos os direitos reservados.</span>
              </div>
            </footer>
          </div>
        </main>
        <QuickCreateMenu />
      </div>
    </div>
  )
}

const quickCreateItems = [
  { href: '/projetos/novo', label: 'Novo projeto' },
  { href: '/artigos/novo', label: 'Novo artigo' },
  { href: '/forum/novo', label: 'Novo tópico' },
]

const protectedPathPrefixes = [
  '/perfil',
  '/meus-artigos',
  '/meus-projetos',
  '/projetos/novo',
  '/artigos/novo',
  '/forum/novo',
]

function isProtectedPath(pathname: string) {
  return protectedPathPrefixes.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}


function QuickCreateMenu() {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-3">
      {open && (
        <div className="w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
          {quickCreateItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block cursor-pointer border-b border-zinc-100 px-4 py-3 text-sm font-medium text-zinc-700 transition last:border-b-0 hover:bg-zinc-50 hover:text-zinc-900"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}

      <button
        type="button"
        aria-label={open ? 'Fechar ações rápidas' : 'Abrir ações rápidas'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="grid h-14 w-14 cursor-pointer place-items-center rounded-full text-white shadow-lg transition hover:scale-105"
        style={{ backgroundColor: '#2F9E41' }}
      >
        <svg
          className={`h-7 w-7 transition-transform ${open ? 'rotate-45' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      </button>
    </div>
  )
}
