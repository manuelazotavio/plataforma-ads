'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

type Project = {
  id: string
  title: string
  description: string | null
  repo_url: string | null
  deploy_url: string | null
  semester: number | null
  is_featured: boolean
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data } = await supabase
        .from('projects')
        .select('id, title, description, repo_url, deploy_url, semester, is_featured, created_at, project_tags(tag_name), project_images(image_url, display_order)')
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
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="w-full max-w-4xl mx-auto">
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
              className="rounded-lg bg-[#0B7A3B] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition"
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
                <div key={project.id} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden flex gap-4 p-4">
                  <div className="relative w-28 h-20 shrink-0 rounded-lg overflow-hidden bg-zinc-100">
                    {cover
                      ? <Image src={cover.image_url} alt={project.title} fill className="object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-zinc-300 text-2xl">◻</div>
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
                            GitHub ↗
                          </a>
                        )}
                        {project.deploy_url && (
                          <a href={project.deploy_url} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-400 hover:text-zinc-700 transition">
                            Demo ↗
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
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
