'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'
import { DEFAULT_PROJECT_TAGS, PROJECT_TAG_OPTIONS_TABLE, uniqueTagNames } from '@/app/lib/projectTags'
import DatePicker from '@/app/components/DatePicker'
import { fileKind, formatFileSize, getFileExtension } from '@/app/lib/files'

export type Collaborator = {
  user_id: string | null
  name: string
}

export type ProjectFormData = {
  title: string
  description: string
  repo_url: string
  deploy_url: string
  semester: string
  start_date: string
  end_date: string
  is_featured: boolean
  tags: string[]
  images: { url: string; type: 'image' | 'video' | 'file'; name?: string; size?: number }[]
  collaborators: Collaborator[]
}

type UserResult = {
  id: string
  name: string
  avatar_url: string | null
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
  const [startDate, setStartDate] = useState(initial?.start_date ?? '')
  const [endDate, setEndDate] = useState(initial?.end_date ?? '')
  const [isFeatured, setIsFeatured] = useState(initial?.is_featured ?? false)
  const [technologyTags, setTechnologyTags] = useState(DEFAULT_PROJECT_TAGS)
  const [tags, setTags] = useState<string[]>(uniqueTagNames(initial?.tags ?? []))
  const [images, setImages] = useState<{ url: string; type: 'image' | 'video' | 'file'; name?: string; size?: number }[]>(initial?.images ?? [])
  const [collaborators, setCollaborators] = useState<Collaborator[]>(initial?.collaborators ?? [])
  const [collabQuery, setCollabQuery] = useState('')
  const [userResults, setUserResults] = useState<UserResult[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [tagQuery, setTagQuery] = useState('')
  const [showTagDropdown, setShowTagDropdown] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const collabRef = useRef<HTMLDivElement>(null)
  const tagRef = useRef<HTMLDivElement>(null)
  const tagInputRef = useRef<HTMLInputElement>(null)

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
    return () => { cancelled = true }
  }, [])

  // Busca usuários ao digitar no campo de colaboradores
  useEffect(() => {
    const q = collabQuery.trim()
    if (q.length < 2) {
      const timeout = setTimeout(() => {
        setUserResults([])
        setShowDropdown(false)
      }, 0)
      return () => clearTimeout(timeout)
    }

    let cancelled = false
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .ilike('name', `%${q}%`)
        .neq('id', userId)
        .limit(5)

      if (cancelled) return
      const already = new Set(collaborators.map((c) => c.user_id).filter(Boolean))
      setUserResults((data ?? []).filter((u) => !already.has(u.id)))
      setShowDropdown(true)
    }, 300)

    return () => { cancelled = true; clearTimeout(timeout) }
  }, [collabQuery, collaborators, userId])

  // Fecha dropdowns ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (collabRef.current && !collabRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
      if (tagRef.current && !tagRef.current.contains(e.target as Node)) {
        setShowTagDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function addTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]))
    setTagQuery('')
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  function addLinkedCollaborator(user: UserResult) {
    setCollaborators((prev) => [...prev, { user_id: user.id, name: user.name }])
    setCollabQuery('')
    setShowDropdown(false)
  }

  function addExternalCollaborator() {
    const name = collabQuery.trim()
    if (!name) return
    setCollaborators((prev) => [...prev, { user_id: null, name }])
    setCollabQuery('')
    setShowDropdown(false)
  }

  function removeCollaborator(index: number) {
    setCollaborators((prev) => prev.filter((_, i) => i !== index))
  }

  async function uploadMediaFiles(files: File[]) {
    if (!files.length) return

    setUploading(true)
    const uploaded: { url: string; type: 'image' | 'video' | 'file'; name?: string; size?: number }[] = []

    for (const file of files) {
      const kind = fileKind(file)
      const ext = getFileExtension(file)
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error } = await supabase.storage
        .from('project-images')
        .upload(path, file, { upsert: true })

      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('project-images').getPublicUrl(path)
        uploaded.push({ url: publicUrl, type: kind, name: file.name, size: file.size })
      }
    }

    setImages((prev) => [...prev, ...uploaded])
    setUploading(false)
  }

  async function handleMediaChange(e: React.ChangeEvent<HTMLInputElement>) {
    await uploadMediaFiles(Array.from(e.target.files ?? []))
    e.target.value = ''
  }

  async function handleMediaDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    await uploadMediaFiles(Array.from(e.dataTransfer.files ?? []))
  }

  async function handleMediaPaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const files = Array.from(e.clipboardData.files ?? [])
    if (!files.length) return
    e.preventDefault()
    await uploadMediaFiles(files)
  }

  function removeMedia(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (!title.trim() || !description.trim()) return
    if (startDate && endDate && startDate > endDate) return
    const validTags = tags.filter((tag) => technologyTags.includes(tag))
    onSave({
      title,
      description,
      repo_url: repoUrl,
      deploy_url: deployUrl,
      semester,
      start_date: startDate,
      end_date: endDate,
      is_featured: isFeatured,
      tags: validTags,
      images,
      collaborators,
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-6">

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-700">Imagens, vídeos e arquivos</label>
        <div
          className="grid grid-cols-3 gap-2 rounded-xl"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleMediaDrop}
          onPaste={handleMediaPaste}
          tabIndex={0}
        >
          {images.map((media, i) => (
            <div key={i} className="relative aspect-video rounded-xl overflow-hidden group bg-zinc-100">
              {media.type === 'video' ? (
                <video src={media.url} className="w-full h-full object-cover" muted loop playsInline />
              ) : media.type === 'file' ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-3 text-center text-zinc-500">
                  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                  </svg>
                  <span className="max-w-full truncate text-xs font-medium">{media.name ?? 'Arquivo'}</span>
                  {media.size && <span className="text-[11px] text-zinc-400">{formatFileSize(media.size)}</span>}
                </div>
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
                {i === 0 ? 'capa' : media.type === 'video' ? '▶ vídeo' : media.type === 'file' ? 'arquivo' : ''}
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
        <p className="text-xs text-zinc-400">Arraste, cole ou faça upload de imagens e vídeos</p>
        <input
          ref={fileInputRef}
          type="file"
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Data inicial">
          <DatePicker
            value={startDate}
            onChange={setStartDate}
            placeholder="Selecionar data"
            className={inputClass}
          />
        </Field>
        <Field label="Data final">
          <DatePicker
            value={endDate}
            onChange={setEndDate}
            placeholder="Selecionar data"
            className={submitted && startDate && endDate && startDate > endDate ? inputErrorClass : inputClass}
          />
          {submitted && startDate && endDate && startDate > endDate && (
            <p className="mt-1 text-xs text-red-500">A data final deve ser depois da inicial.</p>
          )}
        </Field>
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
      </div>

      {/* Colaboradores */}
      <Field label="Colaboradores">
        <div ref={collabRef} className="relative flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={collabQuery}
              onChange={(e) => setCollabQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); addExternalCollaborator() }
                if (e.key === 'Escape') { setShowDropdown(false) }
              }}
              onFocus={() => { if (userResults.length > 0) setShowDropdown(true) }}
              className={inputClass}
              placeholder="Buscar por nome ou digitar colaborador externo..."
              autoComplete="off"
            />
            <button
              type="button"
              onClick={addExternalCollaborator}
              disabled={!collabQuery.trim()}
              className="shrink-0 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 transition"
            >
              Adicionar
            </button>
          </div>

          {showDropdown && (userResults.length > 0 || collabQuery.trim().length >= 2) && (
            <div className="absolute top-full mt-1 left-0 right-0 z-20 rounded-xl border border-zinc-200 bg-white shadow-lg overflow-hidden">
              {userResults.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => addLinkedCollaborator(user)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-50 transition"
                >
                  <span className="shrink-0 w-7 h-7 rounded-full bg-zinc-200 overflow-hidden flex items-center justify-center">
                    {user.avatar_url ? (
                      <Image src={user.avatar_url} alt={user.name} width={28} height={28} className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-xs font-medium text-zinc-600">{user.name.charAt(0).toUpperCase()}</span>
                    )}
                  </span>
                  <span className="flex-1 text-sm text-zinc-800">{user.name}</span>
                  <span className="text-xs text-[#2F9E41] font-medium">Vincular</span>
                </button>
              ))}
              {collabQuery.trim().length >= 2 && (
                <button
                  type="button"
                  onClick={addExternalCollaborator}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-50 transition border-t border-zinc-100"
                >
                  <span className="shrink-0 w-7 h-7 rounded-full border-2 border-dashed border-zinc-300 flex items-center justify-center text-zinc-400 text-xs">+</span>
                  <span className="text-sm text-zinc-600">
                    Adicionar <span className="font-medium text-zinc-900">&quot;{collabQuery.trim()}&quot;</span> sem conta
                  </span>
                </button>
              )}
            </div>
          )}

          {collaborators.length > 0 && (
            <div className="flex flex-col gap-1.5 mt-1">
              {collaborators.map((c, i) => (
                <div key={i} className="flex items-center gap-2.5 rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-medium text-zinc-600">
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="flex-1 text-sm text-zinc-800">{c.name}</span>
                  {c.user_id ? (
                    <span className="text-xs text-[#2F9E41] font-medium">na plataforma</span>
                  ) : (
                    <span className="text-xs text-zinc-400">externo</span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeCollaborator(i)}
                    className="text-zinc-400 hover:text-zinc-700 transition text-base leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Busque usuários da plataforma para vincular, ou adicione colaboradores externos pelo nome.
        </p>
      </Field>

      <Field label="Tecnologias">
        <div ref={tagRef} className="relative">
          <div
            className="flex flex-wrap items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-2 min-h-[42px] focus-within:border-zinc-500 focus-within:ring-2 focus-within:ring-zinc-200 transition cursor-text"
            onClick={() => tagInputRef.current?.focus()}
          >
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-[#2F9E41]/10 border border-[#2F9E41]/25 text-[#2F9E41] text-xs font-medium px-2.5 py-0.5"
              >
                {tag}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => removeTag(tag)}
                  className="text-[#2F9E41]/60 hover:text-[#2F9E41] leading-none transition"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              ref={tagInputRef}
              type="text"
              value={tagQuery}
              onChange={(e) => { setTagQuery(e.target.value); setShowTagDropdown(true) }}
              onFocus={() => setShowTagDropdown(true)}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && !tagQuery && tags.length > 0) removeTag(tags[tags.length - 1])
                if (e.key === 'Escape') { setShowTagDropdown(false); tagInputRef.current?.blur() }
              }}
              className="flex-1 min-w-[140px] outline-none text-sm bg-transparent text-zinc-900 placeholder:text-zinc-400"
              placeholder={tags.length === 0 ? 'Pesquisar tecnologia...' : ''}
              autoComplete="off"
            />
          </div>

          {showTagDropdown && (() => {
            const filtered = technologyTags
              .filter((t) => !tags.includes(t))
              .filter((t) => tagQuery.length === 0 || t.toLowerCase().includes(tagQuery.toLowerCase()))
            return filtered.length > 0 ? (
              <div className="absolute top-full mt-1 left-0 right-0 z-30 rounded-xl border border-zinc-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                {filtered.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { addTag(tag); setShowTagDropdown(true) }}
                    className="flex w-full items-center px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50 transition"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            ) : null
          })()}
        </div>
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
