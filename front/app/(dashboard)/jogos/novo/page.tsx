'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { getAuthUser } from '@/app/lib/auth'
import { fileKind, formatFileSize, getFileExtension } from '@/app/lib/files'
import { useImageCropper } from '@/app/components/ImageCropper'

const GAMES_BUCKET = 'games'
const MAX_EXECUTABLE_BYTES = 50 * 1024 * 1024
const MAX_MEDIA_BYTES = 50 * 1024 * 1024
const MAX_MEDIA_ITEMS = 8

type Media = { file: File; type: 'image' | 'video'; previewUrl: string }

export default function NovoJogoPage() {
  const router = useRouter()
  const { cropImage, cropperNode } = useImageCropper('16:9')
  const executableInputRef = useRef<HTMLInputElement>(null)
  const mediaInputRef = useRef<HTMLInputElement>(null)

  const [userId, setUserId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [about, setAbout] = useState('')
  const [instructions, setInstructions] = useState('')
  const [executable, setExecutable] = useState<File | null>(null)
  const [media, setMedia] = useState<Media[]>([])
  const mediaRef = useRef<Media[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAuthUser().then((user) => {
      if (!user) router.push('/login')
      else setUserId(user.id)
    })
  }, [router])

  useEffect(() => {
    mediaRef.current = media
  }, [media])

  useEffect(() => {
    return () => mediaRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl))
  }, [])

  function handleExecutableChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > MAX_EXECUTABLE_BYTES) {
      setError(`O executável tem ${formatFileSize(file.size)}. O limite é ${formatFileSize(MAX_EXECUTABLE_BYTES)}.`)
      return
    }
    setError(null)
    setExecutable(file)
  }

  async function handleMediaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return

    setError(null)
    const added: Media[] = []
    for (const file of files) {
      if (mediaRef.current.length + added.length >= MAX_MEDIA_ITEMS) {
        setError(`Você pode adicionar no máximo ${MAX_MEDIA_ITEMS} fotos e vídeos.`)
        break
      }

      const kind = fileKind(file)
      if (kind === 'file') {
        setError('Envie apenas fotos ou vídeos como mídia do jogo.')
        continue
      }
      if (file.size > MAX_MEDIA_BYTES) {
        setError(`"${file.name}" tem ${formatFileSize(file.size)}. O limite é ${formatFileSize(MAX_MEDIA_BYTES)}.`)
        continue
      }

      const ready = kind === 'image' ? await cropImage(file) : file
      if (!ready) continue
      added.push({ file: ready, type: kind, previewUrl: URL.createObjectURL(ready) })
    }

    if (added.length > 0) setMedia((prev) => [...prev, ...added])
  }

  function removeMedia(index: number) {
    setMedia((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  async function upload(file: File) {
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${getFileExtension(file)}`
    const { error: uploadError } = await supabase.storage
      .from(GAMES_BUCKET)
      .upload(path, file, { contentType: file.type || undefined })
    if (uploadError) throw uploadError
    return supabase.storage.from(GAMES_BUCKET).getPublicUrl(path).data.publicUrl
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    setError(null)
    if (!userId || !title.trim() || !about.trim() || !instructions.trim() || !executable) return

    setSaving(true)
    try {
      const { data: userRow } = await supabase.from('users').select('role').eq('id', userId).single()
      const isAdmin = userRow?.role === 'admin'

      const executableUrl = await upload(executable)
      const mediaUrls: string[] = []
      for (const item of media) mediaUrls.push(await upload(item.file))

      const { data: game, error: insertError } = await supabase
        .from('community_games')
        .insert({
          user_id: userId,
          title: title.trim(),
          about: about.trim(),
          instructions: instructions.trim(),
          executable_url: executableUrl,
          executable_name: executable.name,
          executable_size: executable.size,
          approved: isAdmin,
        })
        .select('id')
        .single()
      if (insertError) throw insertError

      if (media.length > 0) {
        const { error: mediaError } = await supabase.from('community_game_media').insert(
          media.map((item, i) => ({ game_id: game.id, url: mediaUrls[i], media_type: item.type, display_order: i }))
        )
        if (mediaError) throw mediaError
      }

      if (!isAdmin) {
        await supabase.functions.invoke('send-content-review-request', {
          body: { content_type: 'game', content_id: game.id },
        })
      }

      const params = new URLSearchParams(window.location.search)
      const returnTo = params.get('returnTo')
      const nextStep = parseInt(params.get('nextStep') ?? '')
      if (!Number.isNaN(nextStep)) {
        await supabase.from('users').update({ onboarding_step: nextStep }).eq('id', userId)
      }

      if (returnTo?.startsWith('/') && !returnTo.startsWith('//')) router.push(returnTo)
      else router.push(isAdmin ? `/jogos/${game.id}` : '/jogos?enviado=1')
    } catch (err) {
      const message = err instanceof Error ? err.message : (err as { message?: string })?.message
      setError('Erro ao salvar jogo: ' + (message ?? 'tente novamente.'))
      setSaving(false)
    }
  }

  if (!userId) return null

  const missing = (value: string) => submitted && !value.trim()

  return (
    <div className="min-h-screen bg-white px-4 py-10 dark:bg-zinc-950 md:px-8">
      {cropperNode}
      <div className="mx-auto max-w-2xl">
        <Link href="/jogos" className="text-sm text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
          ← Voltar para jogos
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-zinc-100">Cadastrar jogo</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Publique um jogo feito por você para a comunidade baixar e jogar. Todo jogo passa por uma revisão antes de aparecer na lista.
        </p>

        {error && (
          <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
          <Field label="Título" required>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome do jogo"
              className={missing(title) ? inputErrorClass : inputClass}
            />
          </Field>

          <Field label="Sobre o jogo" required hint="Conte do que se trata, o estilo, quem fez e o que o jogador vai encontrar.">
            <textarea
              rows={4}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="Descreva o jogo..."
              className={(missing(about) ? inputErrorClass : inputClass) + ' resize-none'}
            />
          </Field>

          <Field label="Instruções de uso" required hint="Como instalar, abrir e jogar: controles, requisitos do sistema, etc.">
            <textarea
              rows={5}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={'1. Baixe e extraia o arquivo .zip\n2. Abra o executável\n3. Use as setas para mover e espaço para pular'}
              className={(missing(instructions) ? inputErrorClass : inputClass) + ' resize-none'}
            />
          </Field>

          <Field
            label="Executável"
            required
            hint={`Arquivo que o jogador vai baixar (.zip, .exe, .apk...). Máximo ${formatFileSize(MAX_EXECUTABLE_BYTES)}. Prefira compactar em .zip.`}
          >
            <button
              type="button"
              onClick={() => executableInputRef.current?.click()}
              className={`flex items-center gap-3 rounded-lg border-2 border-dashed px-4 py-4 text-left text-sm transition hover:border-zinc-400 dark:hover:border-zinc-600 ${
                submitted && !executable ? 'border-red-400 text-red-500' : 'border-zinc-300 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400'
              }`}
            >
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1={12} y1={3} x2={12} y2={15} />
              </svg>
              {executable ? (
                <span className="min-w-0">
                  <span className="block truncate font-medium text-zinc-800 dark:text-zinc-200">{executable.name}</span>
                  <span className="text-xs text-zinc-400">{formatFileSize(executable.size)} · clique para trocar</span>
                </span>
              ) : (
                <span>Selecionar arquivo do jogo</span>
              )}
            </button>
            <input ref={executableInputRef} type="file" className="hidden" onChange={handleExecutableChange} />
          </Field>

          <Field
            label="Fotos e vídeos"
            hint={`Adicione quantas quiser (até ${MAX_MEDIA_ITEMS}): prints e vídeos curtos de gameplay. O primeiro é a capa do jogo. Opcional.`}
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {media.map((item, i) => (
                <div key={item.previewUrl} className="group relative aspect-video overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900">
                  {item.type === 'video' ? (
                    <video src={item.previewUrl} className="h-full w-full object-cover" muted playsInline />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(i)}
                    aria-label="Remover"
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white transition hover:bg-black/80"
                  >
                    ×
                  </button>
                  <span className="absolute bottom-1 left-1 rounded-full bg-black/60 px-1.5 py-0.5 text-xs text-white">
                    {i === 0 ? 'Capa' : item.type === 'video' ? '▶ Vídeo' : 'Foto'}
                  </span>
                </div>
              ))}
              {media.length < MAX_MEDIA_ITEMS && (
                <button
                  type="button"
                  onClick={() => mediaInputRef.current?.click()}
                  className="flex aspect-video flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-zinc-300 text-xs text-zinc-400 transition hover:border-zinc-400 hover:text-zinc-600 dark:border-zinc-700 dark:hover:border-zinc-600"
                >
                  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
                  Adicionar
                </button>
              )}
            </div>
            <input ref={mediaInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleMediaChange} />
          </Field>

          <div className="flex items-center justify-between pt-2">
            <Link href="/jogos" className="text-sm text-zinc-500 transition hover:text-zinc-900 dark:hover:text-zinc-100">
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#2F9E41] px-6 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Enviando...' : 'Enviar jogo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-800'

const inputErrorClass =
  'w-full rounded-lg border border-red-400 bg-red-50/30 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:bg-red-950/20 dark:text-zinc-100'

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {hint && <p className="-mt-0.5 text-xs text-zinc-400">{hint}</p>}
      {children}
    </div>
  )
}
