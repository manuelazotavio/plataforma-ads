'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { getAuthUser } from '@/app/lib/auth'
import ProjectForm, { type ProjectFormData } from '@/app/components/ProjectForm'

export default function NovoProjetoPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAuthUser().then((user) => {
      if (!user) router.push('/login')
      else setUserId(user.id)
    })
  }, [router])

  async function handleSave(data: ProjectFormData) {
    if (!userId) return
    setSaving(true)
    setError(null)

    const { data: userRow } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    const { data: project, error: insertError } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        title: data.title,
        description: data.description,
        repo_url: data.repo_url || null,
        deploy_url: data.deploy_url || null,
        semester: data.semester ? parseInt(data.semester) : null,
        is_featured: data.is_featured,
        approved: userRow?.role === 'admin',
      })
      .select('id')
      .single()

    if (insertError) {
      setError('Erro ao salvar projeto: ' + insertError.message)
      setSaving(false)
      return
    }

    if (data.tags.length > 0) {
      await supabase.from('project_tags').insert(
        data.tags.map((tag_name) => ({ project_id: project.id, tag_name }))
      )
    }

    if (data.images.length > 0) {
      await supabase.from('project_images').insert(
        data.images.map((img, i) => ({ project_id: project.id, image_url: img.url, display_order: i, media_type: img.type }))
      )
    }

    router.push('/meus-projetos')
  }

  if (!userId) return null

  return (
    <div className="min-h-screen bg-white px-4 py-12 md:px-6">
      <div className="w-full">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-1">Novo projeto</h1>
        <p className="text-sm text-zinc-500 mb-8">Adicione um projeto ao seu portfólio</p>

        {error && (
          <p className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <ProjectForm
          userId={userId}
          saving={saving}
          onSave={handleSave}
          onCancel={() => router.push('/meus-projetos')}
        />
      </div>
    </div>
  )
}
