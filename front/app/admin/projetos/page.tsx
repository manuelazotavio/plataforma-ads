'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'

type Project = {
  id: string
  title: string
  description: string | null
  approved: boolean
  created_at: string
  users: { name: string; avatar_url: string | null } | null
  project_tags: { tag_name: string }[]
  project_images: { image_url: string; display_order: number }[]
}

type Filter = 'pendentes' | 'aprovados' | 'todos'

export default function AdminProjetosPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('pendentes')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('projects')
        .select('id, title, description, approved, created_at, users(name, avatar_url), project_tags(tag_name), project_images(image_url, display_order)')
        .order('created_at', { ascending: false })
      setProjects((data as Project[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function setApproved(id: string, value: boolean) {
    setUpdatingId(id)
    await supabase.from('projects').update({ approved: value }).eq('id', id)
    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, approved: value } : p))
    setUpdatingId(null)
  }

  const filtered = projects.filter((p) => {
    if (filter === 'pendentes') return !p.approved
    if (filter === 'aprovados') return p.approved
    return true
  })

  const pendingCount = projects.filter((p) => !p.approved).length

  if (loading) return <p className="text-sm text-zinc-500">Carregando...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Projetos</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1">
          {(['pendentes', 'aprovados', 'todos'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition capitalize ${
                filter === f ? 'bg-[#0B7A3B] text-white' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          Nenhum projeto {filter === 'todos' ? '' : filter}.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((project) => {
            const cover = [...project.project_images]
              .sort((a, b) => a.display_order - b.display_order)[0]

            return (
              <div
                key={project.id}
                className={`bg-white rounded-2xl border p-4 flex gap-4 ${
                  !project.approved ? 'border-amber-200' : 'border-zinc-200'
                }`}
              >
                <div className="relative w-20 h-16 rounded-lg overflow-hidden bg-zinc-100 shrink-0">
                  {cover
                    ? <Image src={cover.image_url} alt={project.title} fill className="object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-zinc-300 text-xl">◻</div>
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{project.title}</p>
                      <p className="text-xs text-zinc-400">
                        {project.users?.name} · {new Date(project.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      project.approved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {project.approved ? 'aprovado' : 'pendente'}
                    </span>
                  </div>
                  {project.project_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {project.project_tags.map(({ tag_name }) => (
                        <span key={tag_name} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                          {tag_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 shrink-0 justify-center">
                  {!project.approved ? (
                    <button
                      onClick={() => setApproved(project.id, true)}
                      disabled={updatingId === project.id}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 transition"
                    >
                      Aprovar
                    </button>
                  ) : (
                    <button
                      onClick={() => setApproved(project.id, false)}
                      disabled={updatingId === project.id}
                      className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 transition"
                    >
                      Revogar
                    </button>
                  )}
                  <a
                    href={`/projetos/${project.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-center font-medium text-zinc-500 hover:bg-zinc-50 transition"
                  >
                    Ver ↗
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
