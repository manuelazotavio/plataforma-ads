'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'

type Project = {
  id: string
  title: string
  description: string | null
  approved: boolean
  rejection_message: string | null
  created_at: string
  users: { name: string; avatar_url: string | null } | null
  project_tags: { tag_name: string }[]
  project_images: { image_url: string; display_order: number }[]
}

type Filter = 'pendentes' | 'aprovados' | 'reprovados' | 'todos'

function projectStatus(p: Project) {
  if (p.approved) return 'aprovado'
  if (p.rejection_message) return 'reprovado'
  return 'pendente'
}

export default function AdminProjetosPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('pendentes')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectMessage, setRejectMessage] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('projects')
        .select('id, title, description, approved, rejection_message, created_at, users(name, avatar_url), project_tags(tag_name), project_images(image_url, display_order)')
        .order('created_at', { ascending: false })
      setProjects((data as unknown as Project[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function approve(id: string) {
    setUpdatingId(id)
    setActionError(null)
    const { data, error } = await supabase
      .from('projects')
      .update({ approved: true, rejection_message: null })
      .eq('id', id)
      .select('approved, rejection_message')
      .single()

    if (error || !data?.approved) {
      setActionError(error?.message ?? 'Não foi possível aprovar o projeto. Verifique as permissões no Supabase.')
      setUpdatingId(null)
      return
    }

    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, approved: data.approved, rejection_message: data.rejection_message } : p))
    setUpdatingId(null)
  }

  async function revoke(id: string) {
    setUpdatingId(id)
    setActionError(null)
    const { data, error } = await supabase
      .from('projects')
      .update({ approved: false, rejection_message: null })
      .eq('id', id)
      .select('approved, rejection_message')
      .single()

    if (error || !data) {
      setActionError(error?.message ?? 'Não foi possível revogar a aprovação do projeto.')
      setUpdatingId(null)
      return
    }

    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, approved: data.approved, rejection_message: data.rejection_message } : p))
    setUpdatingId(null)
  }

  async function reject(id: string) {
    const msg = rejectMessage.trim()
    if (!msg) return
    setUpdatingId(id)
    setActionError(null)
    const { data, error } = await supabase
      .from('projects')
      .update({ approved: false, rejection_message: msg })
      .eq('id', id)
      .select('approved, rejection_message')
      .single()

    if (error || !data) {
      setActionError(error?.message ?? 'Não foi possível reprovar o projeto.')
      setUpdatingId(null)
      return
    }

    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, approved: data.approved, rejection_message: data.rejection_message } : p))
    setRejectingId(null)
    setRejectMessage('')
    setUpdatingId(null)
  }

  const filtered = projects.filter((p) => {
    const s = projectStatus(p)
    if (filter === 'pendentes') return s === 'pendente'
    if (filter === 'aprovados') return s === 'aprovado'
    if (filter === 'reprovados') return s === 'reprovado'
    return true
  })

  const pendingCount = projects.filter((p) => projectStatus(p) === 'pendente').length

  if (loading) return <p className="text-sm text-zinc-500">Carregando...</p>

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Projetos</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-1 rounded-lg border border-zinc-200 bg-white p-1 sm:w-auto">
          {(['pendentes', 'aprovados', 'reprovados', 'todos'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition capitalize sm:flex-none ${
                filter === f ? 'bg-[#2F9E41] text-white' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {actionError && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          Nenhum projeto {filter === 'todos' ? '' : filter}.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((project) => {
            const cover = [...project.project_images]
              .sort((a, b) => a.display_order - b.display_order)[0]
            const status = projectStatus(project)

            return (
              <div
                key={project.id}
                className={`bg-white rounded-2xl border p-4 flex flex-col gap-3 ${
                  status === 'pendente' ? 'border-amber-200' : status === 'reprovado' ? 'border-red-200' : 'border-zinc-200'
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="relative h-36 w-full overflow-hidden rounded-lg bg-zinc-100 sm:h-16 sm:w-20 sm:shrink-0">
                    {cover
                      ? <Image src={cover.image_url} alt={project.title} fill className="object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-zinc-300 text-xs">sem imagem</div>
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">{project.title}</p>
                        <p className="text-xs text-zinc-400">
                          {project.users?.name} · {new Date(project.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-[11px] font-semibold ${
                        status === 'aprovado' ? 'border-green-200 text-green-700' :
                        status === 'reprovado' ? 'border-red-200 text-red-600' :
                        'border-amber-200 text-amber-700'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          status === 'aprovado' ? 'bg-green-500' :
                          status === 'reprovado' ? 'bg-red-500' :
                          'bg-amber-500'
                        }`} />
                        <span className="capitalize">{status}</span>
                      </span>
                    </div>
                    {project.project_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {project.project_tags.map(({ tag_name }) => (
                          <span key={tag_name} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs capitalize text-zinc-600">
                            {tag_name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 sm:flex sm:shrink-0 sm:flex-col sm:justify-center">
                    {status !== 'aprovado' && (
                      <button
                        onClick={() => approve(project.id)}
                        disabled={updatingId === project.id}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 transition"
                      >
                        Aprovar
                      </button>
                    )}
                    {status !== 'pendente' && (
                      <button
                        onClick={() => revoke(project.id)}
                        disabled={updatingId === project.id}
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 transition"
                      >
                        Devolver para revisão
                      </button>
                    )}
                    {status !== 'reprovado' && (
                      <button
                        onClick={() => { setRejectingId(project.id); setRejectMessage('') }}
                        disabled={updatingId === project.id}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
                      >
                        Reprovar
                      </button>
                    )}
                    <a
                      href={`/projetos/${project.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-center font-medium text-zinc-500 hover:bg-zinc-50 transition"
                    >
                      Ver
                    </a>
                  </div>
                </div>

                {project.rejection_message && (
                  <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700">
                    <span className="font-semibold">Mensagem enviada ao aluno:</span> {project.rejection_message}
                  </div>
                )}

                {rejectingId === project.id && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                    <textarea
                      value={rejectMessage}
                      onChange={(e) => setRejectMessage(e.target.value)}
                      placeholder="Descreva o que precisa ser alterado..."
                      rows={2}
                      className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-900 outline-none resize-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                    />
                    <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-col">
                      <button
                        onClick={() => reject(project.id)}
                        disabled={!rejectMessage.trim() || updatingId === project.id}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 transition"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => { setRejectingId(null); setRejectMessage('') }}
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
