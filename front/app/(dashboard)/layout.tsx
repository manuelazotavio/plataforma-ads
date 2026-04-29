'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'

type UserProfile = {
  name: string
  avatar_url: string | null
  semester: number | null
}

const sidebarItems = [
  { href: '/inicio', label: 'Início', icon: <IconHome /> },
  { href: '/curso', label: 'O curso', icon: <IconBook /> },
  { href: '/projetos', label: 'Projetos', icon: <IconGrid /> },
  { href: '/eventos', label: 'Eventos', icon: <IconCalendar /> },
  { href: '/vagas', label: 'Oportunidades', icon: <IconBriefcase /> },
  { href: '/egressos', label: 'Egressos', icon: <IconUsers /> },
  { href: '/perfil', label: 'Área do aluno', icon: <IconPerson /> },
  { href: '/contato', label: 'Contato', icon: <IconMessage /> },
]

const topNavItems = [
  { href: '/inicio', label: 'Início', icon: <IconHome size={16} /> },
  { href: '/projetos', label: 'Projetos', icon: <IconGrid size={16} /> },
  { href: '/forum', label: 'Fórum', icon: <IconChat size={16} /> },
  { href: '/alunos', label: 'Alunos', icon: <IconUsers size={16} /> },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/login')
        return
      }
      const { data: profile } = await supabase
        .from('users')
        .select('name, avatar_url, semester')
        .eq('id', authUser.id)
        .single()
      setUser(profile)
      setLoading(false)
    }
    loadUser()
  }, [router])

  if (loading) {
    return <div className="min-h-screen bg-white" />
  }

  return (
    <div className="flex h-screen overflow-hidden">
      
      <aside className="w-56 shrink-0 bg-white border-r border-zinc-100 flex flex-col fixed h-full z-20">
        
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

        
        <nav className="flex flex-col gap-1 px-3 py-4 flex-1 overflow-y-auto">
          {sidebarItems.map((item, i) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            const dividerBefore = i === 5
            return (
              <div key={item.href}>
                {dividerBefore && <div className="my-2 border-t border-zinc-100" />}
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    active
                      ? 'text-white'
                      : 'text-zinc-900 hover:bg-zinc-100'
                  }`}
                  style={active ? { backgroundColor: '#0B7A3B' } : undefined}
                >
                  <span className="shrink-0">{item.icon}</span>
                  {item.label}
                </Link>
              </div>
            )
          })}
        </nav>
      </aside>

      
      <div className="flex flex-col flex-1 ml-56 min-w-0">
       
        <header className="h-16 bg-white border-b border-zinc-100 flex items-stretch px-6 sticky top-0 z-10 shrink-0">

          {/* Nav links com underline no item ativo */}
          <nav className="flex items-stretch gap-1 mr-auto">
            {topNavItems.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 text-sm font-semibold transition-colors border-b-2 ${
                    active
                      ? 'text-green-600 border-green-600'
                      : 'text-zinc-500 border-transparent hover:text-zinc-900'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Direita: busca + sino + usuário */}
          <div className="flex items-center gap-4">

            {/* Busca */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Buscar projetos, tópicos..."
                className="rounded-full bg-zinc-100 pl-8 pr-4 py-2 text-sm text-zinc-500 outline-none focus:bg-zinc-200 transition w-64 placeholder:text-zinc-400"
              />
            </div>

            {/* Sino */}
            <button className="relative text-zinc-400 hover:text-zinc-700 transition">
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
            </button>

            {/* Usuário */}
            <div className="flex items-center gap-3 pl-4 border-l border-zinc-100">
              <div className="text-right leading-tight">
                <p className="text-sm font-semibold text-zinc-900">{user?.name}</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {user?.semester ? `${user.semester}º Semestre` : 'Aluno'}
                </p>
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

          </div>
        </header>

       
        <main className="flex-1 overflow-y-auto bg-white">
          {children}
        </main>
      </div>
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

function IconChat({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}
