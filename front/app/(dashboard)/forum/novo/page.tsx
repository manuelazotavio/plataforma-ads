'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Select from '@/app/components/Select'
import { supabase } from '@/app/lib/supabase'
import { getAuthUser } from '@/app/lib/auth'

type Category = { id: string; name: string }
type Attachment = { type: 'image' | 'video'; url: string }

export default function NovoTopicoPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [videoUrl, setVideoUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.from('forum_categories').select('id, name').order('display_order').then(({ data }) => {
      setCategories((data as Category[]) ?? [])
    })
  }, [])

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)

    const user = await getAuthUser()
    if (!user) { setUploading(false); return }

    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `forum/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage.from('forum-media').upload(path, file)
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('forum-media').getPublicUrl(path)
        setAttachments(prev => [...prev, { type: 'image', url: publicUrl }])
      }
    }
    setUploading(false)
    e.target.value = ''
  }

  function addVideo() {
    const url = videoUrl.trim()
    if (!url) return
    setAttachments(prev => [...prev, { type: 'video', url }])
    setVideoUrl('')
  }

  function removeAttachment(i: number) {
    setAttachments(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (!title.trim() || !content.trim()) return
    setSaving(true)
    setError(null)

    const user = await getAuthUser()
    if (!user) { router.push('/login'); return }

    const { data, error: err } = await supabase
      .from('forum_topics')
      .insert({
        title: title.trim(),
        content: content.trim(),
        user_id: user.id,
        category_id: categoryId || null,
        attachments,
        replies_count: 0,
        views_count: 0,
      })
      .select('id')
      .single()

    if (err || !data) {
      setError('Erro ao criar tópico.')
      setSaving(false)
      return
    }

    router.push(`/forum/${data.id}`)
  }

  return (
    <div className="px-4 md:px-6 py-8 w-full">
      <Link href="/forum" className="text-sm text-zinc-400 hover:text-zinc-700 transition mb-8 inline-flex items-center gap-1.5">
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
        Fórum
      </Link>

      <h1 className="text-2xl font-bold text-zinc-900 mb-8">Novo tópico</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700">Título <span className="text-red-500">*</span></label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className={submitted && !title.trim() ? inputErrorClass : inputClass}
            placeholder="Qual é a sua dúvida ou assunto?"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700">Categoria</label>
          <Select
            value={categoryId}
            onChange={setCategoryId}
            options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
            placeholder="Sem categoria"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700">Conteúdo <span className="text-red-500">*</span></label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={8}
            className={`${submitted && !content.trim() ? inputErrorClass : inputClass} resize-none`}
            placeholder="Descreva o assunto em detalhes..."
          />
        </div>

        
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-zinc-700">Imagens e vídeos</label>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 self-start rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 transition"
            >
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x={3} y={3} width={18} height={18} rx={2} />
                <circle cx={8.5} cy={8.5} r={1.5} />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              {uploading ? 'Enviando...' : 'Adicionar imagem'}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />

            <div className="flex gap-2">
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addVideo())}
                className={`${inputClass} flex-1`}
                placeholder="URL de vídeo (YouTube, Vimeo...)"
              />
              <button
                type="button"
                onClick={addVideo}
                disabled={!videoUrl.trim()}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 transition shrink-0"
              >
                + Vídeo
              </button>
            </div>
          </div>

          {attachments.length > 0 && (
            <div className="flex flex-col gap-2">
              {attachments.map((att, i) => (
                <div key={i} className="relative group rounded-xl overflow-hidden border border-zinc-200 bg-zinc-50">
                  {att.type === 'image' ? (
                    <div className="relative w-full max-h-64 bg-zinc-100">
                      <Image src={att.url} alt="" width={800} height={400} className="w-full h-full object-contain max-h-64" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-zinc-400 shrink-0">
                        <polygon points="23 7 16 12 23 17 23 7" /><rect x={1} y={5} width={15} height={14} rx={2} ry={2} />
                      </svg>
                      <span className="text-xs text-zinc-600 truncate">{att.url}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeAttachment(i)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-black/70"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving || !title.trim() || !content.trim()}
            className="rounded-xl px-8 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition hover:opacity-90"
            style={{ backgroundColor: '#2F9E41' }}
          >
            {saving ? 'Publicando...' : 'Publicar tópico'}
          </button>
          <Link href="/forum" className="rounded-xl border border-zinc-200 px-6 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}

const inputClass = 'rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 transition w-full'

const inputErrorClass = 'rounded-lg border border-red-400 bg-red-50/30 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition w-full'
