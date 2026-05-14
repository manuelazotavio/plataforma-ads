'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { getAuthUser } from '@/app/lib/auth'
import ProjectForm, { type ProjectFormData } from '@/app/components/ProjectForm'

export default function EditarProjetoPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [userId, setUserId] = useState<string | null>(null)
  const [initial, setInitial] = useState<Partial<ProjectFormData> | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const user = await getAuthUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data, error } = await supabase
        .from('projects')
        .select('title, description, repo_url, deploy_url, semester, start_date, end_date, is_featured, project_tags(tag_name), project_images(image_url, display_order, media_type), project_collaborators(user_id, name)')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (error || !data) { router.push('/meus-projetos'); return }

      setInitial({
        title: data.title,
        description: data.description,
        repo_url: data.repo_url ?? '',
        deploy_url: data.deploy_url ?? '',
        semester: data.semester?.toString() ?? '',
        start_date: data.start_date ?? '',
        end_date: data.end_date ?? '',
        is_featured: data.is_featured,
        tags: data.project_tags.map((t: { tag_name: string }) => t.tag_name),
        images: data.project_images
          .sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order)
          .map((img: { image_url: string; media_type: string }) => ({ url: img.image_url, type: (img.media_type ?? 'image') as 'image' | 'video' | 'file' })),
        collaborators: data.project_collaborators.map((c: { user_id: string | null; name: string }) => ({ user_id: c.user_id, name: c.name })),
      })
    }
    load()
  }, [id, router])

  async function handleSave(data: ProjectFormData) {
    if (!userId) return
    setSaving(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('projects')
      .update({
        title: data.title,
        description: data.description,
        repo_url: data.repo_url || null,
        deploy_url: data.deploy_url || null,
        semester: data.semester ? parseInt(data.semester) : null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        is_featured: data.is_featured,
        approved: false,
        rejection_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      setError('Erro ao salvar: ' + updateError.message)
      setSaving(false)
      return
    }

    await supabase.from('project_tags').delete().eq('project_id', id)
    if (data.tags.length > 0) {
      await supabase.from('project_tags').insert(
        data.tags.map((tag_name) => ({ project_id: id, tag_name }))
      )
    }

    await supabase.from('project_images').delete().eq('project_id', id)
    if (data.images.length > 0) {
      await supabase.from('project_images').insert(
        data.images.map((img, i) => ({ project_id: id, image_url: img.url, display_order: i, media_type: img.type }))
      )
    }

    await supabase.from('project_collaborators').delete().eq('project_id', id)
    if (data.collaborators.length > 0) {
      await supabase.from('project_collaborators').insert(
        data.collaborators.map((c) => ({ project_id: id, user_id: c.user_id ?? null, name: c.name }))
      )
    }

    router.push('/meus-projetos')
  }

  if (!initial || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-sm text-zinc-500">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white px-4 py-12 md:px-6">
      <div className="w-full">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-1">Editar projeto</h1>
        <p className="text-sm text-zinc-500 mb-8">Atualize as informações do projeto</p>

        {error && (
          <p className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <ProjectForm
          userId={userId}
          initial={initial}
          saving={saving}
          onSave={handleSave}
          onCancel={() => router.push('/meus-projetos')}
        />
      </div>
    </div>
  )
}
