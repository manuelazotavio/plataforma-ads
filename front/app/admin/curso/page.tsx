'use client'

import { useEffect, useRef, useState } from 'react'
import {
  CLASS_SCHEDULE_PDF_KEY,
  COURSE_DOCUMENTS_BUCKET,
  COURSE_SETTINGS_TABLE,
  courseSettingsSql,
} from '@/app/lib/courseSettings'
import { supabase } from '@/app/lib/supabase'

type PpcDoc = {
  id: string
  label: string
  url: string
  display_order: number
}

export default function AdminCursoPage() {
  const [classScheduleUrl, setClassScheduleUrl] = useState<string | null>(null)
  const [ppcDocs, setPpcDocs] = useState<PpcDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingSchedule, setUploadingSchedule] = useState(false)
  const [uploadingPpc, setUploadingPpc] = useState(false)
  const [ppcLabel, setPpcLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const scheduleRef = useRef<HTMLInputElement | null>(null)
  const ppcRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => { void load() }, [])

  async function load() {
    const [{ data: settings }, { data: ppcs }] = await Promise.all([
      supabase.from(COURSE_SETTINGS_TABLE).select('key, value').eq('key', CLASS_SCHEDULE_PDF_KEY).single(),
      supabase.from('course_ppc_documents').select('id, label, url, display_order').order('display_order', { ascending: false }),
    ])
    setClassScheduleUrl((settings as { key: string; value: string | null } | null)?.value ?? null)
    setPpcDocs((ppcs as PpcDoc[]) ?? [])
    setLoading(false)
  }

  async function uploadSchedule(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Envie um arquivo PDF.')
      return
    }
    setUploadingSchedule(true)
    setError(null)
    setNotice(null)
    const path = `horarios/horarios-aulas-${Date.now()}.pdf`
    const { error: upErr } = await supabase.storage.from(COURSE_DOCUMENTS_BUCKET).upload(path, file, { contentType: 'application/pdf', upsert: true })
    if (upErr) { setError(upErr.message); setUploadingSchedule(false); return }
    const { data: { publicUrl } } = supabase.storage.from(COURSE_DOCUMENTS_BUCKET).getPublicUrl(path)
    const { error: saveErr } = await supabase.from(COURSE_SETTINGS_TABLE).upsert({ key: CLASS_SCHEDULE_PDF_KEY, value: publicUrl, updated_at: new Date().toISOString() })
    if (saveErr) { setError(saveErr.message) } else { setClassScheduleUrl(publicUrl); setNotice('Horário de aulas atualizado.') }
    setUploadingSchedule(false)
  }

  async function removeSchedule() {
    setUploadingSchedule(true)
    setError(null)
    setNotice(null)
    const { error } = await supabase.from(COURSE_SETTINGS_TABLE).upsert({ key: CLASS_SCHEDULE_PDF_KEY, value: null, updated_at: new Date().toISOString() })
    if (error) { setError(error.message) } else { setClassScheduleUrl(null); setNotice('Horário removido.') }
    setUploadingSchedule(false)
  }

  async function uploadPpc(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !ppcLabel.trim()) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Envie um arquivo PDF.')
      return
    }
    setUploadingPpc(true)
    setError(null)
    setNotice(null)
    const path = `projeto-pedagogico/ppc-${Date.now()}.pdf`
    const { error: upErr } = await supabase.storage.from(COURSE_DOCUMENTS_BUCKET).upload(path, file, { contentType: 'application/pdf', upsert: true })
    if (upErr) { setError(upErr.message); setUploadingPpc(false); return }
    const { data: { publicUrl } } = supabase.storage.from(COURSE_DOCUMENTS_BUCKET).getPublicUrl(path)
    const nextOrder = ppcDocs.length > 0 ? Math.max(...ppcDocs.map((d) => d.display_order)) + 1 : 1
    const { error: saveErr } = await supabase.from('course_ppc_documents').insert({ label: ppcLabel.trim(), url: publicUrl, display_order: nextOrder })
    if (saveErr) { setError(saveErr.message) } else {
      setPpcLabel('')
      const { data } = await supabase.from('course_ppc_documents').select('id, label, url, display_order').order('display_order', { ascending: false })
      setPpcDocs((data as PpcDoc[]) ?? [])
      setNotice('PPC adicionado.')
    }
    setUploadingPpc(false)
  }

  async function removePpc(doc: PpcDoc) {
    if (!confirm(`Remover "${doc.label}"?`)) return
    const { error } = await supabase.from('course_ppc_documents').delete().eq('id', doc.id)
    if (error) { setError(error.message) } else { setPpcDocs((prev) => prev.filter((d) => d.id !== doc.id)); setNotice(`"${doc.label}" removido.`) }
  }

  if (loading) return <p className="text-sm text-zinc-500">Carregando...</p>

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900">Curso</h1>
        <p className="mt-0.5 text-sm text-zinc-500">Configure os documentos exibidos na página Sobre o curso.</p>
      </div>

      <div className="flex flex-col gap-5">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Horário de aulas</h2>
              <p className="mt-1 text-sm text-zinc-500">PDF exibido na seção "Sobre o curso".</p>
            </div>
            <button
              type="button"
              onClick={() => scheduleRef.current?.click()}
              disabled={uploadingSchedule}
              className="cursor-pointer rounded-lg bg-[#2F9E41] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {uploadingSchedule ? 'Enviando...' : classScheduleUrl ? 'Trocar PDF' : 'Enviar PDF'}
            </button>
          </div>
          <input ref={scheduleRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={uploadSchedule} />
          {classScheduleUrl && (
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <a href={classScheduleUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[#2F9E41] hover:underline">
                Abrir PDF publicado
              </a>
              <button type="button" onClick={removeSchedule} disabled={uploadingSchedule}
                className="cursor-pointer rounded-lg border border-red-100 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50">
                Remover
              </button>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-zinc-900 mb-1">Histórico de PPCs</h2>
          <p className="mt-1 mb-5 text-sm text-zinc-500">
            Todos os documentos ficam disponíveis publicamente. O mais recente aparece primeiro.
          </p>

          {ppcDocs.length > 0 && (
            <div className="mb-4 flex flex-col gap-2">
              {ppcDocs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between gap-4 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900">{doc.label}</p>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="mt-0.5 block text-xs text-[#2F9E41] hover:underline">
                      Abrir PDF
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePpc(doc)}
                    className="cursor-pointer shrink-0 rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-xl border border-dashed border-zinc-200 p-4 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-zinc-500">
              Rótulo
              <input
                type="text"
                value={ppcLabel}
                onChange={(e) => setPpcLabel(e.target.value)}
                placeholder="Ex: PPC 2023, PPC 2011–2022"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              />
            </label>
            <button
              type="button"
              onClick={() => ppcRef.current?.click()}
              disabled={uploadingPpc || !ppcLabel.trim()}
              className="cursor-pointer rounded-lg bg-[#2F9E41] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {uploadingPpc ? 'Enviando...' : 'Selecionar PDF'}
            </button>
            <input ref={ppcRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={uploadPpc} />
          </div>
        </section>
      </div>

      {notice && <p className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</p>}

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">Erro</p>
          <p className="mt-1 text-red-600">{error}</p>
          <p className="mt-4 text-red-600">Se precisar recriar as tabelas, execute este SQL:</p>
          <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-white p-3 text-xs text-zinc-700">{courseSettingsSql}</pre>
        </div>
      )}
    </div>
  )
}
