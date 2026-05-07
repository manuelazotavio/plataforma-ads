'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'
import NotificationBell from '@/app/components/NotificationBell'
import SearchBar from '@/app/components/SearchBar'

type UserProfile = {
  name: string
  avatar_url: string | null
  semester: number | null
  role: string | null
}

const sidebarItems = [
  { href: '/inicio', label: 'Início', icon: <IconHome /> },
  {
    href: '/curso',
    label: 'O curso',
    icon: <IconBook />,
    children: [
      { href: '/curso#sobre-o-curso', label: 'Sobre o curso' },
      { href: '/curso#matriz-curricular', label: 'Matriz curricular' },
      { href: '/curso#professores', label: 'Professores' },
      { href: '/curso#infraestrutura', label: 'Infraestrutura' },
    ],
  },
  { href: '/projetos', label: 'Projetos', icon: <IconGrid /> },
  { href: '/eventos', label: 'Eventos', icon: <IconCalendar /> },
  { href: '/calendario', label: 'Calendário', icon: <IconCalendarGrid /> },
  { href: '/vagas', label: 'Oportunidades', icon: <IconBriefcase /> },
  { href: '/egressos', label: 'Egressos', icon: <IconUsers /> },
  {
    href: '/area-aluno',
    label: 'Área do Aluno',
    icon: <IconPerson />,
    children: [
      { href: '/area-aluno#materiais', label: 'Materiais' },
      { href: '/area-aluno#orientacoes-academicas', label: 'Orientações acadêmicas' },
      { href: '/area-aluno#links-uteis', label: 'Links úteis' },
    ],
  },
  { href: '/contato', label: 'Contato', icon: <IconMessage /> },
]


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({})
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        setLoading(false)
        return
      }
      setUserId(authUser.id)
      const { data: profile } = await supabase
        .from('users')
        .select('name, avatar_url, semester, role')
        .eq('id', authUser.id)
        .single()
      setUser(profile)
      setLoading(false)
    }
    loadUser()
  }, [])

  useEffect(() => {
    setSidebarOpen(false)
    setUserMenuOpen(false)
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

      <aside className={`w-56 shrink-0 bg-white border-r border-zinc-100 flex flex-col fixed h-full z-30 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        
        <div className="h-16 flex items-center px-5 border-b border-zinc-100 gap-2.5">
          <div className="grid grid-cols-2 gap-0.5 w-7 h-7 shrink-0">
            <div className="rounded-sm bg-green-500" />
            <div className="rounded-sm bg-blue-400" />
            <div className="rounded-sm bg-yellow-400" />
            <div className="rounded-sm bg-red-400" />
          </div>
          <div className="leading-tight">
            <span className="block font-bold text-sm text-zinc-900">ADS</span>
            <span className="block font-bold text-sm text-zinc-900">Comunica</span>
          </div>
        </div>

        
        <nav ref={navRef} className="sidebar-nav flex flex-col gap-1 px-3 py-4 flex-1 overflow-y-auto">
          {sidebarItems.map((item, i) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            const hasChildren = 'children' in item && item.children && item.children.length > 0
            const open = hasChildren && (openItems[item.href] ?? active)
            const dividerBefore = i === 6

            function handleToggle() {
              const opening = !open
              setOpenItems(prev => ({ ...prev, [item.href]: opening }))
              if (opening) {
                requestAnimationFrame(() => {
                  const itemEl = itemRefs.current[item.href]
                  const navEl = navRef.current
                  if (!itemEl || !navEl) return
                  const navRect = navEl.getBoundingClientRect()
                  const itemRect = itemEl.getBoundingClientRect()
                  if (itemRect.bottom > navRect.bottom) {
                    navEl.scrollTop += itemRect.bottom - navRect.bottom + 12
                  }
                })
              }
            }

            return (
              <div key={item.href} ref={el => { itemRefs.current[item.href] = el }}>
                {dividerBefore && <div className="my-2 border-t border-zinc-100" />}
                {hasChildren ? (
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={handleToggle}
                    className={`flex w-full min-w-0 items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors ${
                      active
                        ? 'text-white'
                        : 'text-zinc-900 hover:bg-zinc-100'
                    }`}
                    style={active ? { backgroundColor: '#0B7A3B' } : undefined}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                    <svg
                      className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path fillRule="evenodd" d="M7.22 4.22a.75.75 0 0 1 1.06 0l5.25 5.25a.75.75 0 0 1 0 1.06l-5.25 5.25a.75.75 0 1 1-1.06-1.06L11.94 10 7.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className={`flex min-w-0 items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors ${
                      active
                        ? 'text-white'
                        : 'text-zinc-900 hover:bg-zinc-100'
                    }`}
                    style={active ? { backgroundColor: '#0B7A3B' } : undefined}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                )}
                {hasChildren && open && (
                  <div className="ml-8 mt-1 flex flex-col gap-1 border-l border-zinc-100 pl-3">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-900"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {user?.role === 'admin' && (
          <div className="px-3 pb-4">
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              Painel Admin
            </Link>
          </div>
        )}
      </aside>

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

          <SearchBar />


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
                <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-200 shrink-0 ring-2 ring-zinc-100">
                  {user.avatar_url ? (
                    <Image src={user.avatar_url} alt={user.name} width={36} height={36} className="object-cover w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm font-semibold">
                      {user.name?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                </div>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-zinc-200 bg-white shadow-lg py-1 z-50">
                  <div className="px-4 py-2.5 border-b border-zinc-100">
                    <p className="text-sm font-semibold text-zinc-900 truncate">{user.name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {user.semester ? `${user.semester}º Semestre` : 'Aluno'}
                    </p>
                  </div>
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
        </header>

        <main className="flex-1 overflow-y-auto bg-white">
          <div className="flex flex-col min-h-full">
            <div className="flex-1">
              {children}
            </div>
            <footer className="border-t border-zinc-100 px-4 md:px-10 py-6 mt-8">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-zinc-400">
                <Link href="/regras" className="hover:text-zinc-700 transition">Regras do ADS Comunica</Link>
                <Link href="/privacidade" className="hover:text-zinc-700 transition">Política de Privacidade</Link>
                <Link href="/contrato" className="hover:text-zinc-700 transition">Contrato de Usuário</Link>
                <Link href="/acessibilidade" className="hover:text-zinc-700 transition">Acessibilidade</Link>
                <span className="ml-auto">ADS Comunica, Inc. © 2026. Todos os direitos reservados.</span>
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
        style={{ backgroundColor: '#0B7A3B' }}
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

function IconHome({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function IconBook({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}

function IconGrid({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x={3} y={3} width={7} height={7} />
      <rect x={14} y={3} width={7} height={7} />
      <rect x={14} y={14} width={7} height={7} />
      <rect x={3} y={14} width={7} height={7} />
    </svg>
  )
}

function IconCalendar({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x={3} y={4} width={18} height={18} rx={2} ry={2} />
      <line x1={16} y1={2} x2={16} y2={6} />
      <line x1={8} y1={2} x2={8} y2={6} />
      <line x1={3} y1={10} x2={21} y2={10} />
    </svg>
  )
}

function IconBriefcase({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x={2} y={7} width={20} height={14} rx={2} ry={2} />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}

function IconUsers({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx={9} cy={7} r={4} />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconPerson({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx={12} cy={7} r={4} />
    </svg>
  )
}

function IconMessage({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function IconCalendarGrid({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x={3} y={4} width={18} height={18} rx={2} ry={2} />
      <line x1={16} y1={2} x2={16} y2={6} />
      <line x1={8} y1={2} x2={8} y2={6} />
      <line x1={3} y1={10} x2={21} y2={10} />
      <line x1={8} y1={14} x2={8} y2={14} />
      <line x1={12} y1={14} x2={12} y2={14} />
      <line x1={16} y1={14} x2={16} y2={14} />
      <line x1={8} y1={18} x2={8} y2={18} />
      <line x1={12} y1={18} x2={12} y2={18} />
    </svg>
  )
}




