'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'

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
  { href: '/admin/artigos', label: 'Artigos', icon: <IconBook /> },
  { href: '/admin/vagas', label: 'Vagas', icon: <IconBriefcase /> },
  { href: '/admin/eventos', label: 'Eventos', icon: <IconCalendar /> },
  { href: '/admin/egressos', label: 'Egressos', icon: <IconGraduation /> },
  { href: '/admin/corpo-docente', label: 'Corpo Docente', icon: <IconPerson /> },
  { href: '/admin/forum', label: 'Fórum', icon: <IconChat /> },
  { href: '/admin/permissoes', label: 'Permissões', icon: <IconShield /> },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function check() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
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

      <aside className="w-56 shrink-0 bg-zinc-950 flex flex-col fixed h-full z-20">

        <div className="h-16 flex items-center px-5 border-b border-white/5 gap-2.5">
          <div className="grid grid-cols-2 gap-0.5 w-7 h-7 shrink-0">
            <div className="rounded-sm bg-green-500" />
            <div className="rounded-sm bg-blue-400" />
            <div className="rounded-sm bg-yellow-400" />
            <div className="rounded-sm bg-red-400" />
          </div>
          <div className="leading-tight">
            <span className="block font-bold text-sm text-white">ADS</span>
            <span className="block font-bold text-sm text-zinc-500">Admin</span>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 px-3 py-4 flex-1 overflow-y-auto">
          {nav.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 pb-4">
          <Link
            href="/inicio"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-zinc-600 hover:bg-white/5 hover:text-zinc-400 transition-colors"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Voltar ao site
          </Link>
        </div>
      </aside>

      <div className="flex flex-col flex-1 ml-56 min-w-0">

        <header className="h-16 bg-white border-b border-zinc-100 flex items-center justify-end px-6 sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="text-right leading-tight">
              <p className="text-sm font-semibold text-zinc-900">{user?.name}</p>
              <p className="text-xs text-zinc-400 mt-0.5">Administrador</p>
            </div>
            <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-200 shrink-0 ring-2 ring-zinc-100">
              {user?.avatar_url ? (
                <Image
                  src={user.avatar_url}
                  alt={user.name}
                  width={36}
                  height={36}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm font-semibold">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-white">
          <div className="p-8">
            {children}
          </div>
          <footer className="border-t border-zinc-100 px-8 py-6 mt-4">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-zinc-400">
              <Link href="/regras" className="hover:text-zinc-700 transition">Regras do ADS Comunica</Link>
              <Link href="/privacidade" className="hover:text-zinc-700 transition">Politica de Privacidade</Link>
              <Link href="/contrato" className="hover:text-zinc-700 transition">Contrato de Usuario</Link>
              <Link href="/acessibilidade" className="hover:text-zinc-700 transition">Acessibilidade</Link>
              <span className="ml-auto">ADS Comunica, Inc. © 2026. Todos os direitos reservados.</span>
            </div>
          </footer>
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

function IconShield() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}
