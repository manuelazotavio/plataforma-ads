'use client'

import { useEffect, useRef, useState } from 'react'
import {
  CLASS_SCHEDULE_PDF_KEY,
  COURSE_DOCUMENTS_BUCKET,
  COURSE_SETTINGS_TABLE,
  PEDAGOGICAL_PROJECT_PDF_KEY,
  courseSettingsSql,
} from '@/app/lib/courseSettings'
import { supabase } from '@/app/lib/supabase'

type DocumentKey = typeof CLASS_SCHEDULE_PDF_KEY | typeof PEDAGOGICAL_PROJECT_PDF_KEY

type CourseDocument = {
  key: DocumentKey
  title: string
  description: string
  folder: string
  filePrefix: string
  openLabel: string
  emptyLabel: string
  successMessage: string
  removeMessage: string
}

type CourseSettingRow = {
  key: DocumentKey
  value: string | null
}

const documents: CourseDocument[] = [
  {
    key: CLASS_SCHEDULE_PDF_KEY,
    title: 'Horário de aulas',
    description: 'Envie um PDF para aparecer na seção Sobre o curso.',
    folder: 'horarios',
    filePrefix: 'horarios-aulas',
    openLabel: 'Abrir horário de aulas',
    emptyLabel: 'Enviar PDF',
    successMessage: 'Horário de aulas atualizado.',
    removeMessage: 'Horário de aulas removido da página do curso.',
  },
  {
    key: PEDAGOGICAL_PROJECT_PDF_KEY,
    title: 'Projeto Pedagógico de Curso',
    description: 'Envie o PDF do PPC para aparecer abaixo do horário de aulas.',
    folder: 'projeto-pedagogico',
    filePrefix: 'projeto-pedagogico-curso',
    openLabel: 'Abrir PPC',
    emptyLabel: 'Enviar PPC',
    successMessage: 'Projeto Pedagógico de Curso atualizado.',
    removeMessage: 'Projeto Pedagógico de Curso removido da página do curso.',
  },
]

export default function AdminCursoPage() {
  const [urls, setUrls] = useState<Record<DocumentKey, string | null>>({
    [CLASS_SCHEDULE_PDF_KEY]: null,
    [PEDAGOGICAL_PROJECT_PDF_KEY]: null,
  })
  const [loading, setLoading] = useState(true)
  const [uploadingKey, setUploadingKey] = useState<DocumentKey | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const fileRefs = useRef<Record<DocumentKey, HTMLInputElement | null>>({
    [CLASS_SCHEDULE_PDF_KEY]: null,
    [PEDAGOGICAL_PROJECT_PDF_KEY]: null,
  })

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from(COURSE_SETTINGS_TABLE)
        .select('key, value')
        .in('key', documents.map((doc) => doc.key))

      if (error) {
        setError(error.message)
      } else {
        setUrls((current) => {
          const next = { ...current }
          ;(data as CourseSettingRow[] | null)?.forEach((item) => {
            if (item.key === CLASS_SCHEDULE_PDF_KEY || item.key === PEDAGOGICAL_PROJECT_PDF_KEY) {
              next[item.key] = item.value ?? null
            }
          })
          return next
        })
      }

      setLoading(false)
    }

    load()
  }, [])

  async function uploadDocument(e: React.ChangeEvent<HTMLInputElement>, doc: CourseDocument) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Envie um arquivo PDF.')
      return
    }

    setUploadingKey(doc.key)
    setError(null)
    setNotice(null)

    const path = `${doc.folder}/${doc.filePrefix}-${Date.now()}.pdf`
    const { error: uploadError } = await supabase.storage
      .from(COURSE_DOCUMENTS_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'application/pdf',
      })

    if (uploadError) {
      setError(`Erro ao enviar PDF: ${uploadError.message}`)
      setUploadingKey(null)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from(COURSE_DOCUMENTS_BUCKET)
      .getPublicUrl(path)

    const { error: saveError } = await supabase
      .from(COURSE_SETTINGS_TABLE)
      .upsert({
        key: doc.key,
        value: publicUrl,
        updated_at: new Date().toISOString(),
      })

    if (saveError) {
      setError(`PDF enviado, mas não foi possível salvar a configuração: ${saveError.message}`)
    } else {
      setUrls((current) => ({ ...current, [doc.key]: publicUrl }))
      setNotice(doc.successMessage)
    }

    setUploadingKey(null)
  }

  async function removeDocument(doc: CourseDocument) {
    setUploadingKey(doc.key)
    setError(null)
    setNotice(null)

    const { error } = await supabase
      .from(COURSE_SETTINGS_TABLE)
      .upsert({
        key: doc.key,
        value: null,
        updated_at: new Date().toISOString(),
      })

    if (error) {
      setError(error.message)
    } else {
      setUrls((current) => ({ ...current, [doc.key]: null }))
      setNotice(doc.removeMessage)
    }

    setUploadingKey(null)
  }

  if (loading) return <p className="text-sm text-zinc-500">Carregando...</p>

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900">Curso</h1>
        <p className="mt-0.5 text-sm text-zinc-500">Configure os documentos exibidos na página Sobre o curso.</p>
      </div>

      <div className="flex flex-col gap-5">
        {documents.map((doc) => {
          const url = urls[doc.key]
          const uploading = uploadingKey === doc.key

          return (
            <section key={doc.key} className="rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">{doc.title}</h2>
                  <p className="mt-1 text-sm text-zinc-500">{doc.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => fileRefs.current[doc.key]?.click()}
                  disabled={uploadingKey !== null}
                  className="rounded-lg bg-[#2F9E41] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {uploading ? 'Enviando...' : url ? 'Trocar PDF' : doc.emptyLabel}
                </button>
              </div>

              <input
                ref={(el) => { fileRefs.current[doc.key] = el }}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(event) => uploadDocument(event, doc)}
              />

              {url && (
                <div className="mt-5 flex flex-col gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">PDF publicado</p>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="mt-1 block text-sm text-[#2F9E41] hover:underline">
                      {doc.openLabel}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDocument(doc)}
                    disabled={uploadingKey !== null}
                    className="rounded-lg border border-red-100 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    Remover
                  </button>
                </div>
              )}
            </section>
          )
        })}
      </div>

      {notice && <p className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</p>}

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">Não foi possível salvar o documento.</p>
          <p className="mt-1 text-red-600">{error}</p>
          <p className="mt-4 text-red-600">Se a tabela ou o bucket ainda não existirem, execute este SQL uma vez:</p>
          <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-white p-3 text-xs text-zinc-700">{courseSettingsSql}</pre>
        </div>
      )}
    </div>
  )
}
