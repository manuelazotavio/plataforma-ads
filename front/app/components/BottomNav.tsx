'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  {
    href: '/',
    label: 'Início',
    icon: (active: boolean) => (
      <svg width={22} height={22} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    href: '/projetos',
    label: 'Projetos',
    icon: (active: boolean) => (
      <svg width={22} height={22} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x={3} y={3} width={7} height={7} rx={1} />
        <rect x={14} y={3} width={7} height={7} rx={1} />
        <rect x={14} y={14} width={7} height={7} rx={1} />
        <rect x={3} y={14} width={7} height={7} rx={1} />
      </svg>
    ),
  },
  {
    href: '/forum',
    label: 'Fórum',
    icon: (active: boolean) => (
      <svg width={22} height={22} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    href: '/calendario',
    label: 'Calendário',
    icon: (active: boolean) => (
      <svg width={22} height={22} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x={3} y={4} width={18} height={18} rx={2} />
        <line x1={16} y1={2} x2={16} y2={6} />
        <line x1={8} y1={2} x2={8} y2={6} />
        <line x1={3} y1={10} x2={21} y2={10} />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-100 bg-white md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {ITEMS.map((item) => {
          const active = item.href === '/'
            ? pathname === '/'
            : pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
                active ? 'text-[#2F9E41]' : 'text-zinc-400 hover:text-zinc-700'
              }`}
            >
              {item.icon(active)}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
