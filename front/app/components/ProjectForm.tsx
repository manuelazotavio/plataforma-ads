'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'

export type ProjectFormData = {
  title: string
  description: string
  repo_url: string
  deploy_url: string
  semester: string
  is_featured: boolean
  tags: string[]
  images: { url: string }[]
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
  const [tags, setTags] = useState<string[]>(initial?.tags ?? [])
  const [newTag, setNewTag] = useState('')
  const [images, setImages] = useState<{ url: string }[]>(initial?.images ?? [])
  const [uploadingImages, setUploadingImages] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleImagesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    setUploadingImages(true)
    const uploaded: { url: string }[] = []

    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error } = await supabase.storage
        .from('project-images')
        .upload(path, file, { upsert: true })

      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('project-images').getPublicUrl(path)
        uploaded.push({ url: publicUrl })
      }
    }

    setImages((prev) => [...prev, ...uploaded])
    setUploadingImages(false)
    e.target.value = ''
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index))
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formRef.current?.reportValidity()) return
    onSave({ title, description, repo_url: repoUrl, deploy_url: deployUrl, semester, is_featured: isFeatured, tags, images })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-6">

     
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-700">Imagens do projeto</label>
        <div className="grid grid-cols-3 gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative aspect-video rounded-xl overflow-hidden group">
              <Image src={img.url} alt="" fill className="object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 rounded-full bg-black/60 text-white text-xs w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              >
                ×
              </button>
              {i === 0 && (
                <span className="absolute bottom-1 left-1 rounded-full bg-black/60 text-white text-xs px-1.5 py-0.5">
                  capa
                </span>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImages}
            className="aspect-video rounded-xl border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center text-zinc-400 hover:border-zinc-400 hover:text-zinc-600 disabled:opacity-50 transition text-xs gap-1"
          >
            <span className="text-2xl leading-none">+</span>
            <span>{uploadingImages ? 'Enviando...' : 'Adicionar'}</span>
          </button>
        </div>
        <p className="text-xs text-zinc-400">A primeira imagem é usada como capa.</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImagesChange}
        />
      </div>

      <Field label="Título" required>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
          placeholder="Nome do projeto"
        />
      </Field>

      <Field label="Descrição" required>
        <textarea
          required
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputClass + ' resize-none'}
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

      <Field label="Tags">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            className={inputClass + ' flex-1'}
            placeholder="Ex: React, Node, Python..."
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
              <span key={tag} className="flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                {tag}
                <button type="button" onClick={() => removeTag(tag)} className="text-zinc-400 hover:text-zinc-700 transition">×</button>
              </span>
            ))}
          </div>
        )}
      </Field>

      <label className="flex items-center gap-2 cursor-pointer w-fit">
        <input
          type="checkbox"
          checked={isFeatured}
          onChange={(e) => setIsFeatured(e.target.checked)}
          className="rounded border-zinc-300"
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
          disabled={saving || uploadingImages}
          className="ml-auto rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 transition"
        >
          {saving ? 'Salvando...' : 'Salvar projeto'}
        </button>
      </div>

    </form>
  )
}

const inputClass =
  'rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 transition w-full'

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
