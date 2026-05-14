'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'
import { getAuthUser } from '@/app/lib/auth'
import RichTextEditor from '@/app/components/RichTextEditor'
import TechnologyTagPicker from '@/app/components/TechnologyTagPicker'
import { fileKind, formatFileSize, getFileExtension } from '@/app/lib/files'

type ArticleAttachment = { type: 'image' | 'file'; url: string; name: string; size: number }

function toSlug(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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
  const [attachments, setAttachments] = useState<ArticleAttachment[]>([])
  const [tags, setTags] = useState<string[]>([])

  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingAttachments, setUploadingAttachments] = useState(false)
  const [savingAs, setSavingAs] = useState<'rascunho' | 'pendente' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const attachmentInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    getAuthUser().then((user) => {
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

  async function uploadCoverFile(file: File | undefined) {
    if (!file || !userId) return

    setUploadingCover(true)
    setError(null)

    const ext = getFileExtension(file)
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

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    await uploadCoverFile(e.target.files?.[0])
    e.target.value = ''
  }

  async function handleCoverDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    await uploadCoverFile(Array.from(e.dataTransfer.files ?? []).find((file) => file.type.startsWith('image/')))
  }

  async function handleCoverPaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const image = Array.from(e.clipboardData.files ?? []).find((file) => file.type.startsWith('image/'))
    if (!image) return
    e.preventDefault()
    await uploadCoverFile(image)
  }

  async function uploadArticleFiles(files: File[]) {
    if (!files.length || !userId) return
    setUploadingAttachments(true)
    setError(null)

    const uploaded: ArticleAttachment[] = []

    for (const file of files) {
      const kind = fileKind(file)
      const ext = getFileExtension(file)
      const path = `articles/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('forum-media')
        .upload(path, file, { upsert: true })

      if (uploadError) {
        setError(`Erro ao enviar ${file.name}: ${uploadError.message}`)
        continue
      }

      const { data: { publicUrl } } = supabase.storage.from('forum-media').getPublicUrl(path)
      uploaded.push({ type: kind === 'image' ? 'image' : 'file', url: publicUrl, name: file.name, size: file.size })
    }

    setAttachments((prev) => [...prev, ...uploaded])
    setUploadingAttachments(false)
  }

  async function handleArticleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    await uploadArticleFiles(Array.from(e.target.files ?? []))
    e.target.value = ''
  }

  async function handleArticleFilesDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    await uploadArticleFiles(Array.from(e.dataTransfer.files ?? []))
  }

  async function handleArticleFilesPaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const files = Array.from(e.clipboardData.files ?? [])
    if (!files.length) return
    e.preventDefault()
    await uploadArticleFiles(files)
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  function contentWithAttachments() {
    if (attachments.length === 0) return content
    const blocks = attachments.map((file) => {
      if (file.type === 'image') {
        return `<figure><img src="${file.url}" alt="${escapeHtml(file.name)}" /><figcaption>${escapeHtml(file.name)}</figcaption></figure>`
      }
      return `<p><a href="${file.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(file.name)}</a> <span>(${formatFileSize(file.size)})</span></p>`
    }).join('')

    return `${content}<h2>Anexos</h2>${blocks}`
  }

  async function save(status: 'rascunho' | 'pendente') {
    setSubmitted(true)
    if (!title.trim() || !slug.trim() || !summary.trim() || !content.trim()) return
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
        content: contentWithAttachments(),
        cover_image_url: coverUrl || null,
        status,
        published_at: null,
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

    router.push('/meus-artigos')
  }

  return (
    <div className="min-h-screen bg-white px-4 py-12 md:px-6">
      <div className="w-full">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-1">Novo artigo</h1>
        <p className="text-sm text-zinc-500 mb-8">Escreva e publique seu conteúdo</p>

        <form ref={formRef} className="flex flex-col gap-6">

       
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-700">Capa</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleCoverDrop}
              onPaste={handleCoverPaste}
              tabIndex={0}
              className="relative w-full h-48 rounded-xl border-2 border-dashed border-zinc-300 bg-white overflow-hidden cursor-pointer hover:border-zinc-400 transition flex items-center justify-center"
            >
              {coverUrl ? (
                <Image src={coverUrl} alt="Capa" fill className="object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-zinc-400 select-none">
                  <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                  <span className="text-sm">
                    {uploadingCover ? 'Enviando...' : 'Clique, arraste ou cole uma capa'}
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
                onChange={(e) => handleSlugChange(e.target.value)}
                className="flex-1 px-3 py-2 text-sm text-zinc-900 outline-none bg-transparent"
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
              className={(submitted && !summary.trim() ? inputErrorClass : inputClass) + ' resize-none'}
              placeholder="Breve descrição do artigo..."
            />
          </Field>

          <Field label="Conteúdo" required>
            <div className={submitted && !content.trim() ? 'rounded-xl ring-2 ring-red-200 border border-red-400' : ''}>
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="Escreva o conteúdo do artigo aqui..."
              />
            </div>
          </Field>

          <Field label="Anexos">
            <div
              className="rounded-xl border-2 border-dashed border-zinc-300 px-4 py-5 text-center transition focus-within:border-zinc-500"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleArticleFilesDrop}
              onPaste={handleArticleFilesPaste}
              tabIndex={0}
            >
              <button
                type="button"
                onClick={() => attachmentInputRef.current?.click()}
                disabled={uploadingAttachments}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
              >
                {uploadingAttachments ? 'Enviando...' : 'Adicionar arquivos'}
              </button>
              <p className="mt-2 text-xs text-zinc-400">Clique, arraste ou cole imagens e arquivos. Eles entram no final do artigo.</p>
            </div>
            <input ref={attachmentInputRef} type="file" multiple className="hidden" onChange={handleArticleFilesChange} />
            {attachments.length > 0 && (
              <div className="mt-2 flex flex-col gap-2">
                {attachments.map((file, index) => (
                  <div key={`${file.url}-${index}`} className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2">
                    <span className="flex-1 truncate text-sm text-zinc-700">{file.name}</span>
                    <span className="text-xs text-zinc-400">{formatFileSize(file.size)}</span>
                    <button type="button" onClick={() => removeAttachment(index)} className="text-zinc-400 transition hover:text-zinc-700">×</button>
                  </div>
                ))}
              </div>
            )}
          </Field>

          <Field label="Tags">
            <TechnologyTagPicker value={tags} onChange={setTags} />
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
              onClick={() => save('pendente')}
              className="rounded-lg bg-[#2F9E41] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition"
            >
              {savingAs === 'pendente' ? 'Enviando...' : 'Enviar para revisão'}
            </button>
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
