'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'

type Project = {
  id: string
  title: string
  description: string
  repo_url: string | null
  deploy_url: string | null
  semester: number | null
  is_featured: boolean
  created_at: string
  project_tags: { tag_name: string }[]
  project_images: { image_url: string; display_order: number }[]
}

export default function ProjetosPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

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
    if (!confirm(`Excluir "${title}"? Esta ação não pode ser desfeita.`)) return

    setDeletingId(id)
    await supabase.from('projects').delete().eq('id', id)
    setProjects((prev) => prev.filter((p) => p.id !== id))
    setDeletingId(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-500">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4">
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Meus projetos</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{projects.length} projeto{projects.length !== 1 ? 's' : ''}</p>
          </div>
          <Link
            href="/projetos/novo"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition"
          >
            Novo projeto
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-20 text-zinc-400">
            <p className="text-lg mb-2">Nenhum projeto ainda</p>
            <Link href="/projetos/novo" className="text-sm text-zinc-900 underline">
              Adicionar o primeiro
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {projects.map((project) => {
              const cover = project.project_images
                .sort((a, b) => a.display_order - b.display_order)[0]

              return (
                <div key={project.id} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden flex gap-4 p-4">
                  {cover ? (
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0">
                      <Image src={cover.image_url} alt={project.title} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-zinc-100 shrink-0 flex items-center justify-center text-zinc-300 text-2xl">
                      ◻
                    </div>
                  )}

                  <div className="flex flex-col justify-between flex-1 min-w-0">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-sm font-semibold text-zinc-900 truncate">{project.title}</h2>
                        {project.is_featured && (
                          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                            destaque
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 line-clamp-2">{project.description}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        {project.repo_url && (
                          <a href={project.repo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-400 hover:text-zinc-700 transition">
                            GitHub ↗
                          </a>
                        )}
                        {project.deploy_url && (
                          <a href={project.deploy_url} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-400 hover:text-zinc-700 transition">
                            Deploy ↗
                          </a>
                        )}
                      </div>
                      {project.project_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {project.project_tags.map(({ tag_name }) => (
                            <span key={tag_name} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                              {tag_name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-zinc-400">
                        {new Date(project.created_at).toLocaleDateString('pt-BR')}
                      </p>
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
