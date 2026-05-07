'use client'

import { useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

type SidebarItem = {
  href: string
  label: string
  icon: React.ReactNode
  children?: { href: string; label: string }[]
}

const sidebarItems: SidebarItem[] = [
  { href: '/', label: 'Início', icon: <IconHome /> },
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

type AppSidebarProps = {
  open?: boolean
  onClose?: () => void
}

export default function AppSidebar({ open = true, onClose }: AppSidebarProps) {
  const pathname = usePathname()
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({})
  const navRef = useRef<HTMLElement>(null)
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({})

  return (
    <aside className={`w-56 shrink-0 bg-white border-r border-zinc-100 flex flex-col fixed h-full z-30 transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
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
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'))
          const hasChildren = Boolean(item.children?.length)
          const expanded = hasChildren && (openItems[item.href] ?? false)
          const dividerBefore = i === 6

          function handleToggle() {
            const opening = !expanded
            setOpenItems((prev) => ({ ...prev, [item.href]: opening }))
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
            <div key={item.href} ref={(el) => { itemRefs.current[item.href] = el }}>
              {dividerBefore && <div className="my-2 border-t border-zinc-100" />}
              {hasChildren ? (
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={handleToggle}
                  className={`flex w-full min-w-0 items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    active ? 'text-white' : 'text-zinc-900 hover:bg-zinc-100'
                  }`}
                  style={active ? { backgroundColor: '#0B7A3B' } : undefined}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                  <svg
                    className={`h-4 w-4 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
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
                  onClick={onClose}
                  className={`flex min-w-0 items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    active ? 'text-white' : 'text-zinc-900 hover:bg-zinc-100'
                  }`}
                  style={active ? { backgroundColor: '#0B7A3B' } : undefined}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </Link>
              )}
              {hasChildren && expanded && (
                <div className="ml-8 mt-1 flex flex-col gap-1 border-l border-zinc-100 pl-3">
                  {item.children!.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={onClose}
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

    </aside>
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
