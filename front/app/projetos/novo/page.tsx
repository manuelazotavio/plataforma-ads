'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { getAuthUser } from '@/app/lib/auth'
import ProjectForm, { type ProjectFormData } from '@/app/components/ProjectForm'

export default function NovoProjetoPage() {
  return (
    <Suspense>
      <NovoProjetoContent />
    </Suspense>
  )
}

function NovoProjetoContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo')
  const nextStep = searchParams.get('nextStep')
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

    const isAdmin = userRow?.role === 'admin'

    const { data: project, error: insertError } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        title: data.title,
        description: data.description,
        repo_url: data.repo_url || null,
        deploy_url: data.deploy_url || null,
        semester: data.semester ? parseInt(data.semester) : null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        is_featured: data.is_featured,
        category: data.category || null,
        approved: isAdmin,
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

    if (data.collaborators.length > 0) {
      await supabase.from('project_collaborators').insert(
        data.collaborators.map((c) => ({ project_id: project.id, user_id: c.user_id ?? null, name: c.name }))
      )
    }

    if (!isAdmin) {
      await supabase.functions.invoke('send-content-review-request', {
        body: { content_type: 'project', content_id: project.id },
      })
    }

    if (nextStep) {
      await supabase.from('users').update({ onboarding_step: parseInt(nextStep) }).eq('id', userId)
    }
    router.push(returnTo ?? (isAdmin ? '/meus-projetos' : '/meus-projetos?enviado=1'))
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
          onCancel={() => router.push(returnTo ?? '/meus-projetos')}
        />
      </div>
    </div>
  )
}
