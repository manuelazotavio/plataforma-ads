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

type ReadmePreview = {
  title: string
  description: string
  images: string[]
  repoName: string
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
  const [importingReadme, setImportingReadme] = useState(false)
  const [applyingReadme, setApplyingReadme] = useState(false)
  const [readmeError, setReadmeError] = useState<string | null>(null)
  const [readmePreview, setReadmePreview] = useState<ReadmePreview | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const collabRef = useRef<HTMLDivElement>(null)
  const tagRef = useRef<HTMLDivElement>(null)
  const tagInputRef = useRef<HTMLInputElement>(null)
  const readmeImportInFlightRef = useRef<string | null>(null)

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

  async function importReadmeFromRepository() {
    setReadmeError(null)
    const repo = parseGithubRepoUrl(repoUrl)
    if (!repo) {
      setReadmeError('Informe um link válido do GitHub para importar o README.')
      return
    }

    const importKey = `${repo.owner}/${repo.name}`.toLowerCase()
    if (readmeImportInFlightRef.current === importKey) return

    readmeImportInFlightRef.current = importKey
    setImportingReadme(true)
    try {
      const preview = await fetchReadmePreview(repo.owner, repo.name)
      if (!preview.title && !preview.description && preview.images.length === 0) {
        setReadmeError('README encontrado, mas não consegui identificar dados para importar.')
        return
      }
      setReadmePreview(preview)
    } catch (error) {
      setReadmeError(error instanceof Error ? error.message : 'Não foi possível importar o README.')
    } finally {
      if (readmeImportInFlightRef.current === importKey) {
        readmeImportInFlightRef.current = null
      }
      setImportingReadme(false)
    }
  }

  async function applyReadmePreview() {
    if (!readmePreview) return
    setApplyingReadme(true)
    setReadmeError(null)

    try {
      if (readmePreview.title) setTitle(readmePreview.title)
      if (readmePreview.description) setDescription(readmePreview.description)

      const importedImages = await downloadAndUploadReadmeImages(readmePreview.images, userId)
      if (importedImages.length > 0) setImages((prev) => [...prev, ...importedImages])

      setReadmePreview(null)
    } catch {
      setReadmeError('Os dados foram encontrados, mas não foi possível importar as imagens do README.')
    } finally {
      setApplyingReadme(false)
    }
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
          <div className="flex gap-2">
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => {
                setRepoUrl(e.target.value)
                setReadmeError(null)
              }}
              onBlur={() => {
                if (repoUrl.trim() && parseGithubRepoUrl(repoUrl) && !readmePreview && !importingReadme && !applyingReadme) {
                  void importReadmeFromRepository()
                }
              }}
              className={inputClass}
              placeholder="https://github.com/..."
            />
            <button
              type="button"
              onClick={importReadmeFromRepository}
              disabled={importingReadme || applyingReadme || !repoUrl.trim()}
              className="shrink-0 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              {importingReadme ? 'Buscando...' : 'Importar README'}
            </button>
          </div>
          {readmeError && <p className="mt-1 text-xs text-red-500">{readmeError}</p>}
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
          disabled={saving || uploading || applyingReadme}
          className="ml-auto rounded-lg bg-[#2F9E41] px-6 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition"
        >
          {saving ? 'Salvando...' : 'Salvar projeto'}
        </button>
      </div>

      {readmePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#2F9E41]">Prévia do README</p>
                <h2 className="mt-1 text-lg font-semibold text-zinc-900">{readmePreview.repoName}</h2>
              </div>
              <button
                type="button"
                onClick={() => setReadmePreview(null)}
                disabled={applyingReadme}
                className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50"
                aria-label="Fechar prévia"
              >
                <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {readmePreview.title && (
                <div>
                  <p className="text-xs font-semibold text-zinc-400">Título</p>
                  <p className="mt-1 text-sm font-medium text-zinc-900">{readmePreview.title}</p>
                </div>
              )}
              {readmePreview.description && (
                <div>
                  <p className="text-xs font-semibold text-zinc-400">Descrição</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">{readmePreview.description}</p>
                </div>
              )}
              {readmePreview.images.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-zinc-400">Imagens encontradas</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {readmePreview.images.map((imageUrl) => (
                      <div key={imageUrl} className="aspect-video overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setReadmePreview(null)}
                disabled={applyingReadme}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={applyReadmePreview}
                disabled={applyingReadme}
                className="rounded-lg bg-[#2F9E41] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {applyingReadme ? 'Importando imagens...' : 'Usar dados no formulário'}
              </button>
            </div>
          </div>
        </div>
      )}

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

type GithubRepo = {
  owner: string
  name: string
}

type GithubReadmeResponse = {
  name: string
  path: string
  download_url: string | null
}

type GithubRepoResponse = {
  default_branch?: string
}

type ReadmeContext = {
  owner: string
  repo: string
  defaultBranch: string
  downloadUrl: string
}

function parseGithubRepoUrl(value: string): GithubRepo | null {
  const raw = value.trim()
  if (!raw) return null

  const ssh = raw.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i)
  if (ssh) return { owner: ssh[1], name: ssh[2] }

  try {
    const normalized = raw.startsWith('http') ? raw : `https://${raw}`
    const url = new URL(normalized)
    if (!/(^|\.)github\.com$/i.test(url.hostname)) return null

    const [owner, repo] = url.pathname.replace(/^\/+/, '').split('/')
    if (!owner || !repo) return null

    return { owner, name: repo.replace(/\.git$/i, '') }
  } catch {
    return null
  }
}

async function fetchReadmePreview(owner: string, repo: string): Promise<ReadmePreview> {
  const [repoResponse, readmeResponse] = await Promise.all([
    fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { Accept: 'application/vnd.github+json' },
    }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
      headers: { Accept: 'application/vnd.github+json' },
    }),
  ])

  if (!readmeResponse.ok) {
    throw new Error('Não encontrei um README público nesse repositório.')
  }

  const readmeData = await readmeResponse.json() as GithubReadmeResponse
  if (!readmeData.download_url) {
    throw new Error('O README foi encontrado, mas não está disponível para importação.')
  }

  const repoData = repoResponse.ok
    ? await repoResponse.json() as GithubRepoResponse
    : null

  const markdownResponse = await fetch(readmeData.download_url)
  if (!markdownResponse.ok) {
    throw new Error('Não foi possível baixar o conteúdo do README.')
  }

  const markdown = await markdownResponse.text()
  return parseReadme(markdown, {
    owner,
    repo,
    defaultBranch: repoData?.default_branch ?? 'main',
    downloadUrl: readmeData.download_url,
  })
}

function parseReadme(markdown: string, context: ReadmeContext): ReadmePreview {
  const title = stripMarkdown(markdown.match(/^#\s+(.+)$/m)?.[1] ?? '')
  const withoutCode = markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')

  const paragraphs = withoutCode
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  const description = paragraphs
    .map((paragraph) => paragraph.replace(/^#+\s+.+$/gm, '').trim())
    .filter((paragraph) => paragraph && !isReadmeNoise(paragraph))
    .map(stripMarkdown)
    .find((paragraph) => paragraph.length >= 20) ?? ''

  const markdownImages = Array.from(markdown.matchAll(/!\[[^\]]*]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g))
    .map((match) => match[1])
  const htmlImages = Array.from(markdown.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi))
    .map((match) => match[1])
  const images = [...markdownImages, ...htmlImages]
    .map((src) => resolveReadmeImageUrl(src, context))
    .filter((src): src is string => Boolean(src))
    .filter(isUsefulReadmeImage)
    .filter((src, index, all) => all.indexOf(src) === index)
    .slice(0, 8)

  return {
    title,
    description: description.slice(0, 1200),
    images,
    repoName: `${context.owner}/${context.repo}`,
  }
}

function isReadmeNoise(value: string) {
  const trimmed = value.trim()
  return (
    trimmed.startsWith('![') ||
    trimmed.startsWith('|') ||
    trimmed.startsWith('---') ||
    /^<p[^>]*align=/i.test(trimmed) ||
    /shields\.io|badgen\.net|badge|github\.com\/.*\/actions\/workflows/i.test(trimmed)
  )
}

function stripMarkdown(value: string) {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/[`*_~>#-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function resolveReadmeImageUrl(src: string, context: ReadmeContext) {
  const cleanSrc = src.trim().replace(/^<|>$/g, '')
  if (!cleanSrc || cleanSrc.startsWith('data:')) return null
  if (/^https?:\/\//i.test(cleanSrc)) return cleanSrc
  if (cleanSrc.startsWith('//')) return `https:${cleanSrc}`
  if (cleanSrc.startsWith('/')) {
    return `https://raw.githubusercontent.com/${context.owner}/${context.repo}/${context.defaultBranch}${cleanSrc}`
  }

  try {
    return new URL(cleanSrc, context.downloadUrl).toString()
  } catch {
    return null
  }
}

function isUsefulReadmeImage(src: string) {
  return (
    !/shields\.io|badgen\.net|badge|github\.com\/.*\/actions\/workflows/i.test(src) &&
    (
      /\.(png|jpe?g|gif|webp)(\?|#|$)/i.test(src) ||
      /github\.com\/.*\/assets\/|user-images\.githubusercontent\.com|raw\.githubusercontent\.com/i.test(src)
    )
  )
}

async function downloadAndUploadReadmeImages(imageUrls: string[], userId: string): Promise<ProjectFormData['images']> {
  const imported: ProjectFormData['images'] = []

  for (const imageUrl of imageUrls) {
    try {
      const response = await fetch(imageUrl)
      if (!response.ok) throw new Error('image download failed')

      const blob = await response.blob()
      if (!blob.type.startsWith('image/')) throw new Error('invalid image type')

      const ext = getExtensionFromImageUrl(imageUrl) ?? mimeToExtension(blob.type)
      const fileName = getFileNameFromImageUrl(imageUrl, ext)
      const file = new File([blob], fileName, { type: blob.type })
      const path = `${userId}/readme-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error } = await supabase.storage
        .from('project-images')
        .upload(path, file, { upsert: true })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage.from('project-images').getPublicUrl(path)
      imported.push({ url: publicUrl, type: 'image', name: file.name, size: file.size })
    } catch {
      imported.push({ url: imageUrl, type: 'image', name: getFileNameFromImageUrl(imageUrl, 'png') })
    }
  }

  return imported
}

function getExtensionFromImageUrl(imageUrl: string) {
  try {
    const pathname = new URL(imageUrl).pathname
    const match = pathname.match(/\.([a-z0-9]+)$/i)
    return match?.[1]?.toLowerCase()
  } catch {
    return null
  }
}

function mimeToExtension(mime: string) {
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/gif') return 'gif'
  if (mime === 'image/webp') return 'webp'
  return 'png'
}

function getFileNameFromImageUrl(imageUrl: string, ext: string) {
  try {
    const pathname = new URL(imageUrl).pathname
    const name = decodeURIComponent(pathname.split('/').pop() ?? '').replace(/[^\w.-]/g, '-')
    return name || `readme-image.${ext}`
  } catch {
    return `readme-image.${ext}`
  }
}
