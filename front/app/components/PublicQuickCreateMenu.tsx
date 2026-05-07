'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

const quickCreateItems = [
  { href: '/cadastro', label: 'Novo projeto' },
  { href: '/cadastro', label: 'Novo artigo' },
  { href: '/login', label: 'Novo tópico' },
]

export default function PublicQuickCreateMenu() {
  const [open, setOpen] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setLoggedIn(Boolean(user)))
  }, [])

  const items = loggedIn
    ? [
        { href: '/projetos/novo', label: 'Novo projeto' },
        { href: '/artigos/novo', label: 'Novo artigo' },
        { href: '/forum/novo', label: 'Novo tópico' },
      ]
    : quickCreateItems

  return (
    <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-3">
      {open && (
        <div className="w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
          {items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block border-b border-zinc-100 px-4 py-3 text-sm font-medium text-zinc-700 transition last:border-b-0 hover:bg-zinc-50 hover:text-zinc-900"
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
        className="grid h-14 w-14 place-items-center rounded-full text-white shadow-lg transition hover:scale-105"
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
