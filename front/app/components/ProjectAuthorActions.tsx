'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { getAuthUser } from '@/app/lib/auth'

type Props = {
  projectId: string
  projectUserId: string
  isActive: boolean
}

export default function ProjectAuthorActions({ projectId, projectUserId, isActive }: Props) {
  const router = useRouter()
  const [isAuthor, setIsAuthor] = useState(false)
  const [active, setActive] = useState(isActive)
  const [toggling, setToggling] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAuthUser().then((user) => {
      if (user && (user.id === projectUserId)) setIsAuthor(true)
    })
  }, [projectUserId])

  if (!isAuthor) return null

  async function handleToggleActive() {
    setToggling(true)
    setError(null)
    const { error } = await supabase
      .from('projects')
      .update({ is_active: !active })
      .eq('id', projectId)
    if (error) {
      setError('Não foi possível alterar a visibilidade.')
    } else {
      setActive((v) => !v)
      router.refresh()
    }
    setToggling(false)
  }

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    const { error } = await supabase.from('projects').delete().eq('id', projectId)
    if (error) {
      setError('Não foi possível excluir o projeto.')
      setDeleting(false)
      return
    }
    router.push('/meus-projetos')
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <button
          type="button"
          onClick={handleToggleActive}
          disabled={toggling}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
            active
              ? 'border-zinc-200 text-zinc-500 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700'
              : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
          }`}
        >
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            {active
              ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
              : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
            }
          </svg>
          {toggling ? 'Aguarde...' : active ? 'Inativar projeto' : 'Reativar projeto'}
        </button>

        <button
          type="button"
          onClick={() => { setError(null); setPendingDelete(true) }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
        >
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
          </svg>
          Excluir projeto
        </button>

        {error && <p className="w-full text-xs text-red-600">{error}</p>}
      </div>

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-500">
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
              </svg>
            </div>
            <h3 className="text-base font-semibold text-zinc-900">Excluir projeto?</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              O projeto e todos os seus dados serão removidos permanentemente. Esta ação não pode ser desfeita.
            </p>
            {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => { setPendingDelete(false); setError(null) }}
                disabled={deleting}
                className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
