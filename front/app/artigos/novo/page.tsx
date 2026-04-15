'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
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

export default function NovoArtigoPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [summary, setSummary] = useState('')
  const [content, setContent] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')

  const [uploadingCover, setUploadingCover] = useState(false)
  const [savingAs, setSavingAs] = useState<'rascunho' | 'publicado' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login')
      else setUserId(user.id)
    })
  }, [router])

  function handleTitleChange(value: string) {
    setTitle(value)
    if (!slugEdited) setSlug(toSlug(value))
  }

  function handleSlugChange(value: string) {
    setSlug(toSlug(value))
    setSlugEdited(true)
  }

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    setUploadingCover(true)
    setError(null)

    const ext = file.name.split('.').pop()
    const path = `${userId}/${Date.now()}.${ext}`

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

  async function save(status: 'rascunho' | 'publicado') {
    if (!formRef.current?.reportValidity()) return
    if (!userId) return

    setSavingAs(status)
    setError(null)

    const { data: article, error: insertError } = await supabase
      .from('articles')
      .insert({
        user_id: userId,
        title,
        slug,
        summary,
        content,
        cover_image_url: coverUrl || null,
        status,
        published_at: status === 'publicado' ? new Date().toISOString() : null,
      })
      .select('id')
      .single()

    if (insertError) {
      setError('Erro ao salvar artigo: ' + insertError.message)
      setSavingAs(null)
      return
    }

    if (tags.length > 0) {
      const { error: tagsError } = await supabase.from('article_tags').insert(
        tags.map((tag_name) => ({ article_id: article.id, tag_name }))
      )
      if (tagsError) {
        setError('Artigo salvo, mas erro ao salvar tags: ' + tagsError.message)
        setSavingAs(null)
        return
      }
    }

    router.push('/artigos')
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4">
      <div className="w-full max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-1">Novo artigo</h1>
        <p className="text-sm text-zinc-500 mb-8">Escreva e publique seu conteúdo</p>

        <form ref={formRef} className="flex flex-col gap-6">

          {/* Capa */}
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
                  <span className="text-3xl">+</span>
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
              onChange={(e) => handleTitleChange(e.target.value)}
              className={inputClass}
              placeholder="Título do artigo"
            />
          </Field>

          <Field label="Slug (URL)" required>
            <div className="flex items-center rounded-lg border border-zinc-300 overflow-hidden focus-within:border-zinc-500 focus-within:ring-2 focus-within:ring-zinc-200 transition">
              <span className="px-3 py-2 text-sm text-zinc-400 bg-zinc-50 border-r border-zinc-300 select-none">
                /artigos/
              </span>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                className="flex-1 px-3 py-2 text-sm text-zinc-900 outline-none bg-white"
                placeholder="meu-artigo"
              />
            </div>
          </Field>

          <Field label="Resumo" required>
            <textarea
              required
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className={inputClass + ' resize-none'}
              placeholder="Breve descrição do artigo..."
            />
          </Field>

          <Field label="Conteúdo" required>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Escreva o conteúdo do artigo aqui..."
            />
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

          <div className="flex gap-3 pt-2">
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
              className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 transition"
            >
              {savingAs === 'publicado' ? 'Publicando...' : 'Publicar'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

const inputClass =
  'rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 transition w-full'

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
