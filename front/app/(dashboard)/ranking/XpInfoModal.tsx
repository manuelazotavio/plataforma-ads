'use client'

import { useState } from 'react'
import { XP_PROJECT, XP_ARTICLE, XP_TOPIC, XP_COMMENT, XP_LIKE_RECEIVED, XP_PROFILE_AVATAR, XP_PROFILE_BIO, XP_PROFILE_LINK } from '@/app/lib/xp'

const ITEMS = [
  { label: 'Projeto publicado',    detail: `por projeto`,        xp: XP_PROJECT },
  { label: 'Artigo publicado',     detail: `por artigo`,         xp: XP_ARTICLE },
  { label: 'Tópico no fórum',      detail: `por tópico`,         xp: XP_TOPIC },
  { label: 'Comentário feito',     detail: `por comentário`,     xp: XP_COMMENT },
  { label: 'Curtida recebida',     detail: `por curtida`,        xp: XP_LIKE_RECEIVED },
  { label: 'Foto de perfil',       detail: `bônus único`,        xp: XP_PROFILE_AVATAR },
  { label: 'Bio preenchida',       detail: `bônus único`,        xp: XP_PROFILE_BIO },
  { label: 'Link de perfil',       detail: `por link`,           xp: XP_PROFILE_LINK },
]

export default function XpInfoModal() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-zinc-300 transition hover:text-zinc-500"
        aria-label="Como o XP é calculado"
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6 sm:items-center" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              <h3 className="text-sm font-semibold text-zinc-900">Como o XP é calculado</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-700 transition">
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                </svg>
              </button>
            </div>
            <div className="flex flex-col divide-y divide-zinc-100">
              {ITEMS.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="text-sm text-zinc-700">{item.label}</span>
                    <span className="text-xs text-zinc-400">{item.detail}</span>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-[#2F9E41]">+{item.xp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
