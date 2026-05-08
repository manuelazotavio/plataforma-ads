'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { getAuthUser } from '@/app/lib/auth'

type Project = {
  id: string
  title: string
  description: string | null
  repo_url: string | null
  deploy_url: string | null
  semester: number | null
  is_featured: boolean
  approved: boolean
  rejection_message: string | null
  created_at: string
  project_tags: { tag_name: string }[]
  project_images: { image_url: string; display_order: number }[]
}

export default function MeusProjetosPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const user = await getAuthUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data } = await supabase
        .from('projects')
        .select('id, title, description, repo_url, deploy_url, semester, is_featured, approved, rejection_message, created_at, project_tags(tag_name), project_images(image_url, display_order)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setProjects(data ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Excluir "${title}"?`)) return
    setDeletingId(id)

    await supabase.from('project_tags').delete().eq('project_id', id)
    await supabase.from('project_images').delete().eq('project_id', id)
    await supabase.from('projects').delete().eq('id', id)

    setProjects((prev) => prev.filter((p) => p.id !== id))
    setDeletingId(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-sm text-zinc-500">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white px-4 py-12 md:px-6">
      <div className="w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Meus projetos</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{projects.length} projeto{projects.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/projetos"
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
            >
              Ver todos
            </Link>
            <Link
              href="/projetos/novo"
              className="rounded-lg bg-[#2F9E41] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition"
            >
              Novo projeto
            </Link>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-20 text-zinc-400">
            <p className="text-lg">Você ainda não tem projetos.</p>
            <Link href="/projetos/novo" className="mt-3 inline-block text-sm text-zinc-600 underline hover:text-zinc-900 transition">
              Criar primeiro projeto
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {projects.map((project) => {
              const cover = [...(project.project_images ?? [])]
                .sort((a, b) => a.display_order - b.display_order)[0]
              const tags = project.project_tags ?? []

              return (
                <div key={project.id} className={`bg-white rounded-2xl border overflow-hidden flex flex-col p-4 gap-3 ${project.rejection_message ? 'border-red-200' : 'border-zinc-200'}`}>
                  {project.rejection_message && (
                    <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 flex gap-2">
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-red-500 shrink-0 mt-0.5"><circle cx={12} cy={12} r={10}/><line x1={12} y1={8} x2={12} y2={12}/><line x1={12} y1={16} x2={12.01} y2={16}/></svg>
                      <div>
                        <p className="text-xs font-semibold text-red-700 mb-0.5">Projeto reprovado — edite e reenvie</p>
                        <p className="text-xs text-red-600">{project.rejection_message}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-4">
                    <div className="relative w-28 h-20 shrink-0 rounded-lg overflow-hidden bg-zinc-100">
                      {cover
                        ? <Image src={cover.image_url} alt={project.title} fill className="object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-zinc-300 text-2xl">?</div>
                      }
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h2 className="text-sm font-semibold text-zinc-900">{project.title}</h2>
                          {project.semester && (
                            <span className="text-xs text-zinc-400">{project.semester}º semestre</span>
                          )}
                        </div>
                        {project.is_featured && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 shrink-0">
                            destaque
                          </span>
                        )}
                      </div>

                      {project.description && (
                        <p className="text-xs text-zinc-500 line-clamp-2">{project.description}</p>
                      )}

                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {tags.map(({ tag_name }) => (
                            <span key={tag_name} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                              {tag_name}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-auto pt-1">
                        <div className="flex gap-3">
                          {project.repo_url && (
                            <a href={project.repo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-400 hover:text-zinc-700 transition">
                              GitHub ?
                            </a>
                          )}
                          {project.deploy_url && (
                            <a href={project.deploy_url} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-400 hover:text-zinc-700 transition">
                              Demo ?
                            </a>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Link
                            href={`/projetos/${project.id}/editar`}
                            className="rounded-lg border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition"
                          >
                            Editar
                          </Link>
                          <button
                            onClick={() => handleDelete(project.id, project.title)}
                            disabled={deletingId === project.id}
                            className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
                          >
                            {deletingId === project.id ? 'Excluindo...' : 'Excluir'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
