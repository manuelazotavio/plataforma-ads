'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

const nav = [
  { href: '/admin', label: 'Visão geral', exact: true },
  { href: '/admin/usuarios', label: 'Usuários' },
  { href: '/admin/projetos', label: 'Projetos' },
  { href: '/admin/artigos', label: 'Artigos' },
  { href: '/admin/vagas', label: 'Vagas' },
  { href: '/admin/corpo-docente', label: 'Corpo Docente' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
      if (!data || !['admin', 'moderador'].includes(data.role)) { router.push('/'); return }
      setReady(true)
    }
    check()
  }, [router])

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <p className="text-sm text-zinc-500">Verificando acesso...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-white flex">
      <aside className="w-52 bg-white border-r border-zinc-200 flex flex-col shrink-0 fixed h-full z-10">
        <div className="px-4 py-5 border-b border-zinc-100">
          <p className="text-xs font-semibold text-zinc-900 mb-0.5">Painel Admin</p>
          <Link href="/" className="text-xs text-zinc-400 hover:text-zinc-700 transition">
            ← Voltar ao site
          </Link>
        </div>
        <nav className="flex flex-col gap-0.5 p-2 flex-1 overflow-y-auto">
          {nav.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? 'bg-zinc-900 text-white font-medium'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>
      <main className="flex-1 p-8 min-w-0 ml-52">
        {children}
      </main>
    </div>
  )
}
