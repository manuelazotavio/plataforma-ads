'use client'

import { useEffect, useRef, useState } from 'react'
import {
  CLASS_SCHEDULE_PDF_KEY,
  COURSE_DOCUMENTS_BUCKET,
  COURSE_SETTINGS_TABLE,
  courseSettingsSql,
} from '@/app/lib/courseSettings'
import { supabase } from '@/app/lib/supabase'

export default function AdminCursoPage() {
  const [scheduleUrl, setScheduleUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from(COURSE_SETTINGS_TABLE)
        .select('value')
        .eq('key', CLASS_SCHEDULE_PDF_KEY)
        .maybeSingle()

      if (error) {
        setError(error.message)
      } else {
        setScheduleUrl(data?.value ?? null)
      }

      setLoading(false)
    }

    load()
  }, [])

  async function uploadSchedule(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Envie um arquivo PDF.')
      return
    }

    setUploading(true)
    setError(null)
    setNotice(null)

    const path = `horarios/horarios-aulas-${Date.now()}.pdf`
    const { error: uploadError } = await supabase.storage
      .from(COURSE_DOCUMENTS_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'application/pdf',
      })

    if (uploadError) {
      setError(`Erro ao enviar PDF: ${uploadError.message}`)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from(COURSE_DOCUMENTS_BUCKET)
      .getPublicUrl(path)

    const { error: saveError } = await supabase
      .from(COURSE_SETTINGS_TABLE)
      .upsert({
        key: CLASS_SCHEDULE_PDF_KEY,
        value: publicUrl,
        updated_at: new Date().toISOString(),
      })

    if (saveError) {
      setError(`PDF enviado, mas não foi possível salvar a configuração: ${saveError.message}`)
    } else {
      setScheduleUrl(publicUrl)
      setNotice('Horário de aulas atualizado.')
    }

    setUploading(false)
  }

  async function removeSchedule() {
    setUploading(true)
    setError(null)
    setNotice(null)

    const { error } = await supabase
      .from(COURSE_SETTINGS_TABLE)
      .upsert({
        key: CLASS_SCHEDULE_PDF_KEY,
        value: null,
        updated_at: new Date().toISOString(),
      })

    if (error) {
      setError(error.message)
    } else {
      setScheduleUrl(null)
      setNotice('Horário de aulas removido da página do curso.')
    }

    setUploading(false)
  }

  if (loading) return <p className="text-sm text-zinc-500">Carregando...</p>

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900">Curso</h1>
        <p className="mt-0.5 text-sm text-zinc-500">Configure os documentos exibidos na página Sobre o curso.</p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Horário de aulas</h2>
            <p className="mt-1 text-sm text-zinc-500">Envie um PDF para aparecer na seção Sobre o curso.</p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-lg bg-[#2F9E41] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {uploading ? 'Enviando...' : scheduleUrl ? 'Trocar PDF' : 'Enviar PDF'}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={uploadSchedule}
        />

        {scheduleUrl && (
          <div className="mt-5 flex flex-col gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-900">PDF publicado</p>
              <a href={scheduleUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block text-sm text-[#2F9E41] hover:underline">
                Abrir horário de aulas
              </a>
            </div>
            <button
              type="button"
              onClick={removeSchedule}
              disabled={uploading}
              className="rounded-lg border border-red-100 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              Remover
            </button>
          </div>
        )}
      </section>

      {notice && <p className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</p>}

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">Não foi possível salvar o horário.</p>
          <p className="mt-1 text-red-600">{error}</p>
          <p className="mt-4 text-red-600">Se a tabela ou o bucket ainda não existirem, execute este SQL uma vez:</p>
          <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-white p-3 text-xs text-zinc-700">{courseSettingsSql}</pre>
        </div>
      )}
    </div>
  )
}
