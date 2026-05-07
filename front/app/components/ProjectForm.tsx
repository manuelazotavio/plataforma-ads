'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'
import { DEFAULT_PROJECT_TAGS, PROJECT_TAG_OPTIONS_TABLE, uniqueTagNames } from '@/app/lib/projectTags'

export type ProjectFormData = {
  title: string
  description: string
  repo_url: string
  deploy_url: string
  semester: string
  is_featured: boolean
  tags: string[]
  images: { url: string; type: 'image' | 'video' }[]
}

type Props = {
  userId: string
  initial?: Partial<ProjectFormData>
  saving: boolean
  onSave: (data: ProjectFormData) => void
  onCancel?: () => void
}

export default function ProjectForm({ userId, initial, saving, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [repoUrl, setRepoUrl] = useState(initial?.repo_url ?? '')
  const [deployUrl, setDeployUrl] = useState(initial?.deploy_url ?? '')
  const [semester, setSemester] = useState(initial?.semester ?? '')
  const [isFeatured, setIsFeatured] = useState(initial?.is_featured ?? false)
  const [technologyTags, setTechnologyTags] = useState(DEFAULT_PROJECT_TAGS)
  const [tags, setTags] = useState<string[]>(uniqueTagNames(initial?.tags ?? []))
  const [images, setImages] = useState<{ url: string; type: 'image' | 'video' }[]>(initial?.images ?? [])
  const [uploading, setUploading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    let cancelled = false

    async function loadTechnologyTags() {
      const { data, error } = await supabase
        .from(PROJECT_TAG_OPTIONS_TABLE)
        .select('name')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true })

      if (cancelled || error) return

      const configuredTags = uniqueTagNames((data ?? []).map((item) => item.name))
      if (configuredTags.length > 0) {
        setTechnologyTags(configuredTags)
      }
    }

    loadTechnologyTags()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleMediaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    setUploading(true)
    const uploaded: { url: string; type: 'image' | 'video' }[] = []

    for (const file of files) {
      const isVideo = file.type.startsWith('video/')
      const ext = file.name.split('.').pop()
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error } = await supabase.storage
        .from('project-images')
        .upload(path, file, { upsert: true })

      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('project-images').getPublicUrl(path)
        uploaded.push({ url: publicUrl, type: isVideo ? 'video' : 'image' })
      }
    }

    setImages((prev) => [...prev, ...uploaded])
    setUploading(false)
    e.target.value = ''
  }

  function removeMedia(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  function toggleTag(tag: string) {
    setTags((prev) => (
      prev.includes(tag)
        ? prev.filter((current) => current !== tag)
        : [...prev, tag]
    ))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (!title.trim() || !description.trim()) return
    const validTags = tags.filter((tag) => technologyTags.includes(tag))
    onSave({ title, description, repo_url: repoUrl, deploy_url: deployUrl, semester, is_featured: isFeatured, tags: validTags, images })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-6">

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-700">Imagens e vídeos</label>
        <div className="grid grid-cols-3 gap-2">
          {images.map((media, i) => (
            <div key={i} className="relative aspect-video rounded-xl overflow-hidden group bg-zinc-100">
              {media.type === 'video' ? (
                <video src={media.url} className="w-full h-full object-cover" muted loop playsInline />
              ) : (
                <Image src={media.url} alt="" fill className="object-cover" />
              )}
              <button
                type="button"
                onClick={() => removeMedia(i)}
                className="absolute top-1 right-1 rounded-full bg-black/60 text-white text-xs w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              >
                ×
              </button>
              <span className="absolute bottom-1 left-1 rounded-full bg-black/60 text-white text-xs px-1.5 py-0.5">
                {i === 0 ? 'capa' : media.type === 'video' ? '▶ vídeo' : ''}
              </span>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="aspect-video rounded-xl border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center text-zinc-400 hover:border-zinc-400 hover:text-zinc-600 disabled:opacity-50 transition text-xs gap-1"
          >
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            <span>{uploading ? 'Enviando...' : 'Adicionar'}</span>
          </button>
        </div>
        <p className="text-xs text-zinc-400">Aceita imagens e vídeos. O primeiro item é usado como capa.</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={handleMediaChange}
        />
      </div>

      <Field label="Título" required>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={submitted && !title.trim() ? inputErrorClass : inputClass}
          placeholder="Nome do projeto"
        />
      </Field>

      <Field label="Descrição" required>
        <textarea
          required
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={(submitted && !description.trim() ? inputErrorClass : inputClass) + ' resize-none'}
          placeholder="Descreva o projeto, tecnologias usadas, desafios..."
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Repositório (GitHub)">
          <input
            type="url"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            className={inputClass}
            placeholder="https://github.com/..."
          />
        </Field>
        <Field label="Deploy / Link">
          <input
            type="url"
            value={deployUrl}
            onChange={(e) => setDeployUrl(e.target.value)}
            className={inputClass}
            placeholder="https://..."
          />
        </Field>
      </div>

      <Field label="Semestre">
        <input
          type="number"
          min={1}
          max={8}
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
          className={inputClass}
          placeholder="Ex: 3"
        />
      </Field>

      <Field label="Tecnologias">
        <div className="flex flex-wrap gap-2">
          {technologyTags.map((tag) => {
            const active = tags.includes(tag)
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? 'border-[#2F9E41] bg-[#2F9E41] text-white'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
                }`}
              >
                {tag}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          Selecione apenas tecnologias da lista para manter os filtros organizados.
        </p>
      </Field>

      <label className="flex items-center gap-2 cursor-pointer w-fit">
        <input
          type="checkbox"
          checked={isFeatured}
          onChange={(e) => setIsFeatured(e.target.checked)}
          className="w-4.5 h-4.5 accent-[#2F9E41]"
        />
        <span className="text-sm text-zinc-700">Marcar como destaque no perfil</span>
      </label>

      <div className="flex items-center justify-between pt-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-sm text-zinc-500 hover:text-zinc-900 transition">
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={saving || uploading}
          className="ml-auto rounded-lg bg-[#2F9E41] px-6 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition"
        >
          {saving ? 'Salvando...' : 'Salvar projeto'}
        </button>
      </div>

    </form>
  )
}

const inputClass =
  'rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 transition w-full'

const inputErrorClass =
  'rounded-lg border border-red-400 bg-red-50/30 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition w-full'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-zinc-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
