'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'
import RichTextEditor from '@/app/components/RichTextEditor'

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
  const [coverUrl, setCoverUrl] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [status, setStatus] = useState<'rascunho' | 'publicado'>('rascunho')

  const [loading, setLoading] = useState(true)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [savingAs, setSavingAs] = useState<'rascunho' | 'publicado' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data, error } = await supabase
        .from('articles')
        .select('title, slug, summary, content, cover_image_url, status, article_tags(tag_name)')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (error || !data) { router.push('/meus-artigos'); return }

      setTitle(data.title)
      setSlug(data.slug)
      setSummary(data.summary)
      setContent(data.content)
      setCoverUrl(data.cover_image_url ?? '')
      setStatus(data.status)
      setTags(data.article_tags.map((t: { tag_name: string }) => t.tag_name))
      setLoading(false)
    }
    load()
  }, [id, router])

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingCover(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    const ext = file.name.split('.').pop()
    const path = `${user!.id}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('covers')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError('Erro ao enviar capa: ' + uploadError.message)
      setUploadingCover(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(path)
    setCoverUrl(publicUrl)
    setUploadingCover(false)
  }

  function addTag() {
    const trimmed = newTag.trim()
    if (!trimmed || tags.includes(trimmed)) return
    setTags((prev) => [...prev, trimmed])
    setNewTag('')
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  async function save(newStatus: 'rascunho' | 'publicado') {
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
        cover_image_url: coverUrl || null,
        status: newStatus,
        published_at: newStatus === 'publicado' && status !== 'publicado'
          ? new Date().toISOString()
          : undefined,
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
        <p className="text-sm text-zinc-500">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="w-full max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-1">Editar artigo</h1>
        <p className="text-sm text-zinc-500 mb-8">Atualize as informações do seu artigo</p>

        <form ref={formRef} className="flex flex-col gap-6">

          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-700">Capa</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative w-full h-48 rounded-xl border-2 border-dashed border-zinc-300 bg-white overflow-hidden cursor-pointer hover:border-zinc-400 transition flex items-center justify-center"
            >
              {coverUrl ? (
                <Image src={coverUrl} alt="Capa" fill className="object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-zinc-400 select-none">
                  <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                  <span className="text-sm">
                    {uploadingCover ? 'Enviando...' : 'Clique para adicionar uma capa'}
                  </span>
                </div>
              )}
              {coverUrl && (
                <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition flex items-center justify-center opacity-0 hover:opacity-100">
                  <span className="text-white text-sm font-medium">Trocar imagem</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverChange}
            />
          </div>

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
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className={inputClass + ' flex-1'}
                placeholder="Ex: React, Carreira..."
              />
              <button
                type="button"
                onClick={addTag}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition"
              >
                Adicionar
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-zinc-400 hover:text-zinc-700 transition"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
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
                disabled={!!savingAs || uploadingCover}
                onClick={() => save('rascunho')}
                className="rounded-lg border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 transition"
              >
                {savingAs === 'rascunho' ? 'Salvando...' : 'Salvar rascunho'}
              </button>
              <button
                type="button"
                disabled={!!savingAs || uploadingCover}
                onClick={() => save('publicado')}
                className="rounded-lg bg-[#2F9E41] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition"
              >
                {savingAs === 'publicado' ? 'Publicando...' : 'Publicar'}
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
