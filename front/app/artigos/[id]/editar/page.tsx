'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { getAuthUser } from '@/app/lib/auth'
import RichTextEditor from '@/app/components/RichTextEditor'
import TechnologyTagPicker from '@/app/components/TechnologyTagPicker'
import { LoadingState } from '@/app/components/LoadingScreen'

function toSlug(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

export default function EditarArtigoPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [summary, setSummary] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])

  const [loading, setLoading] = useState(true)
  const [savingAs, setSavingAs] = useState<'rascunho' | 'pendente' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    async function load() {
      const user = await getAuthUser()
      if (!user) { router.push('/login'); return }

      const { data, error } = await supabase
        .from('articles')
        .select('title, slug, summary, content, status, article_tags(tag_name)')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (error || !data) { router.push('/meus-artigos'); return }

      setTitle(data.title)
      setSlug(data.slug)
      setSummary(data.summary)
      setContent(data.content)
      setTags(data.article_tags.map((t: { tag_name: string }) => t.tag_name))
      setLoading(false)
    }
    load()
  }, [id, router])

  async function save(newStatus: 'rascunho' | 'pendente') {
    setSubmitted(true)
    if (!title.trim() || !slug.trim() || !summary.trim() || !content.trim()) return

    setSavingAs(newStatus)
    setError(null)

    const { error: updateError } = await supabase
      .from('articles')
      .update({
        title,
        slug,
        summary,
        content,
        status: newStatus,
        rejection_message: null,
        published_at: newStatus === 'pendente' ? null : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      setError('Erro ao salvar: ' + updateError.message)
      setSavingAs(null)
      return
    }

    await supabase.from('article_tags').delete().eq('article_id', id)

    if (tags.length > 0) {
      const { error: tagsError } = await supabase.from('article_tags').insert(
        tags.map((tag_name) => ({ article_id: id, tag_name }))
      )
      if (tagsError) {
        setError('Artigo salvo, mas erro ao salvar tags: ' + tagsError.message)
        setSavingAs(null)
        return
      }
    }

    router.push('/meus-artigos')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <LoadingState message="Carregando artigo" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white px-4 py-12 md:px-6">
      <div className="w-full">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-1">Editar artigo</h1>
        <p className="text-sm text-zinc-500 mb-8">Atualize as informações do seu artigo</p>

        <form ref={formRef} className="flex flex-col gap-6">

          <Field label="Título" required>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={submitted && !title.trim() ? inputErrorClass : inputClass}
              placeholder="Título do artigo"
            />
          </Field>

          <Field label="Slug (URL)" required>
            <div className={`flex items-center rounded-lg border overflow-hidden transition ${submitted && !slug.trim() ? 'border-red-400 bg-red-50/30 focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-100' : 'border-zinc-300 focus-within:border-zinc-500 focus-within:ring-2 focus-within:ring-zinc-200'}`}>
              <span className="px-3 py-2 text-sm text-zinc-400 bg-zinc-50 border-r border-zinc-300 select-none">
                /artigos/
              </span>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(toSlug(e.target.value))}
                className="flex-1 px-3 py-2 text-sm text-zinc-900 outline-none bg-transparent"
              />
            </div>
          </Field>

          <Field label="Resumo" required>
            <textarea
              required
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className={(submitted && !summary.trim() ? inputErrorClass : inputClass) + ' resize-none'}
            />
          </Field>

          <Field label="Conteúdo" required>
            <div className={submitted && !content.trim() ? 'rounded-xl ring-2 ring-red-200 border border-red-400' : ''}>
              <RichTextEditor value={content} onChange={setContent} />
            </div>
          </Field>

          <Field label="Tags">
            <TechnologyTagPicker value={tags} onChange={setTags} />
          </Field>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => router.push('/meus-artigos')}
              className="text-sm text-zinc-500 hover:text-zinc-900 transition"
            >
              Cancelar
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={!!savingAs}
                onClick={() => save('rascunho')}
                className="rounded-lg border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 transition"
              >
                {savingAs === 'rascunho' ? 'Salvando...' : 'Salvar rascunho'}
              </button>
              <button
                type="button"
                disabled={!!savingAs}
                onClick={() => save('pendente')}
                className="rounded-lg bg-[#2F9E41] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition"
              >
                {savingAs === 'pendente' ? 'Enviando...' : 'Enviar para revisão'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  )
}

const inputClass =
  'rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 transition w-full'

const inputErrorClass =
  'rounded-lg border border-red-400 bg-red-50/30 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition w-full'

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-zinc-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
