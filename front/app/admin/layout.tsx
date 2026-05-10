'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'
import { getAuthUser } from '@/app/lib/auth'
import ThemeToggle from '@/app/components/ThemeToggle'

type UserProfile = {
  name: string
  avatar_url: string | null
  role: string | null
}

const nav = [
  { href: '/admin', label: 'Visão geral', exact: true, icon: <IconGrid /> },
  { href: '/admin/usuarios', label: 'Usuários', icon: <IconUsers /> },
  { href: '/admin/projetos', label: 'Projetos', icon: <IconFolder /> },
  { href: '/admin/tecnologias', label: 'Tecnologias', icon: <IconTags /> },
  { href: '/admin/matriz-curricular', label: 'Matriz Curricular', icon: <IconBook /> },
  { href: '/admin/artigos', label: 'Artigos', icon: <IconBook /> },
  { href: '/admin/vagas', label: 'Oportunidades', icon: <IconBriefcase /> },
  { href: '/admin/eventos', label: 'Eventos', icon: <IconCalendar /> },
  { href: '/admin/egressos', label: 'Egressos', icon: <IconGraduation /> },
  { href: '/admin/corpo-docente', label: 'Corpo Docente', icon: <IconPerson /> },
  { href: '/admin/forum', label: 'Fórum', icon: <IconChat /> },
  { href: '/admin/niveis', label: 'Níveis', icon: <IconStar /> },
  { href: '/admin/permissoes', label: 'Permissões', icon: <IconShield /> },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [ready, setReady] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    async function check() {
      const authUser = await getAuthUser()
      if (!authUser) { router.push('/login'); return }
      const { data } = await supabase.from('users').select('name, avatar_url, role').eq('id', authUser.id).single()
      if (!data || data.role !== 'admin') { router.push('/'); return }
      setUser(data)
      setReady(true)
    }
    check()
  }, [router])

  if (!ready) return <div className="min-h-screen bg-white" />

  return (
    <div className="flex h-screen overflow-hidden">

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`w-56 shrink-0 bg-zinc-950 flex flex-col fixed h-full z-30 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>

        <Link
          href="/admin"
          onClick={() => setSidebarOpen(false)}
          className="h-16 flex items-center px-5 border-b border-white/5 gap-2.5 transition hover:bg-white/5"
        >
          <div className="w-7 h-3 rounded-sm bg-white shrink-0" />
          <div className="leading-tight">
            <span className="block font-bold text-sm text-white">ADS</span>
            <span className="block font-bold text-sm text-zinc-500">Admin</span>
          </div>
        </Link>
        <div className="absolute right-5 top-5 md:hidden">
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-zinc-500 hover:text-white transition"
            aria-label="Fechar menu"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <line x1={18} y1={6} x2={6} y2={18}/><line x1={6} y1={6} x2={18} y2={18}/>
            </svg>
          </button>
        </div>

        <nav className="sidebar-nav flex flex-col gap-1 px-3 py-4 flex-1 overflow-y-auto">
          {nav.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex min-w-0 items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="shrink-0 px-3 pb-4">
          <Link
            href="/"
            onClick={() => setSidebarOpen(false)}
            className="flex min-w-0 items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-zinc-600 hover:bg-white/5 hover:text-zinc-400 transition-colors"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span className="truncate">Voltar ao site</span>
          </Link>
        </div>
      </aside>

      <div className="flex flex-col flex-1 ml-0 md:ml-56 min-w-0">

        <header className="h-16 bg-white border-b border-zinc-100 flex items-center justify-end px-4 md:px-6 sticky top-0 z-10 shrink-0 gap-3 md:gap-4">
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

          <div className="flex items-center gap-3 ml-auto">
            <ThemeToggle />
            <div className="text-right leading-tight hidden sm:block">
              <p className="text-sm font-semibold text-zinc-900">{user?.name}</p>
              <p className="text-xs text-zinc-400 mt-0.5">Administrador</p>
            </div>
            <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-200 shrink-0 ring-2 ring-zinc-100">
              {user?.avatar_url ? (
                <Image src={user.avatar_url} alt={user.name} width={36} height={36} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm font-semibold">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-white">
          <div className="flex flex-col min-h-full">
            <div className="flex-1 p-4 md:p-8">
              {children}
            </div>
            <footer className="border-t border-zinc-100 px-4 md:px-8 py-6 mt-4">
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
      </div>
    </div>
  )
}

function IconGrid() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x={3} y={3} width={7} height={7} /><rect x={14} y={3} width={7} height={7} />
      <rect x={14} y={14} width={7} height={7} /><rect x={3} y={14} width={7} height={7} />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx={9} cy={7} r={4} />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconFolder() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function IconTags() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1={7} y1={7} x2={7.01} y2={7} />
    </svg>
  )
}

function IconBook() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}

function IconBriefcase() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x={2} y={7} width={20} height={14} rx={2} ry={2} /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x={3} y={4} width={18} height={18} rx={2} ry={2} />
      <line x1={16} y1={2} x2={16} y2={6} /><line x1={8} y1={2} x2={8} y2={6} /><line x1={3} y1={10} x2={21} y2={10} />
    </svg>
  )
}

function IconGraduation() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  )
}

function IconPerson() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx={12} cy={7} r={4} />
    </svg>
  )
}

function IconChat() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}

function IconStar() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function IconShield() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}
