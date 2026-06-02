'use client'

import { useEffect, useState } from 'react'
import { LoadingState } from '@/app/components/LoadingScreen'
import { COURSE_SETTINGS_TABLE } from '@/app/lib/courseSettings'
import {
  DEFAULT_MASCOT_PHRASES,
  MASCOT_PHRASES_KEY,
  parseMascotPhrases,
} from '@/app/lib/mascotSettings'
import { supabase } from '@/app/lib/supabase'

export default function AdminMascotePage() {
  const [phrasesText, setPhrasesText] = useState(DEFAULT_MASCOT_PHRASES.join('\n'))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from(COURSE_SETTINGS_TABLE)
        .select('value')
        .eq('key', MASCOT_PHRASES_KEY)
        .maybeSingle()

      if (error) {
        setError(error.message)
      } else {
        setPhrasesText(parseMascotPhrases(data?.value).join('\n'))
      }

      setLoading(false)
    }

    load()
  }, [])

  async function save() {
    const phrases = phrasesText
      .split('\n')
      .map((phrase) => phrase.trim())
      .filter(Boolean)

    if (phrases.length === 0) {
      setError('Adicione pelo menos uma frase.')
      return
    }

    setSaving(true)
    setError(null)
    setNotice(null)

    const { error } = await supabase.from(COURSE_SETTINGS_TABLE).upsert({
      key: MASCOT_PHRASES_KEY,
      value: JSON.stringify(phrases),
      updated_at: new Date().toISOString(),
    })

    if (error) {
      setError(error.message)
    } else {
      setNotice('Frases do mascote salvas.')
      setPhrasesText(phrases.join('\n'))
    }

    setSaving(false)
  }

  function restoreDefaults() {
    setPhrasesText(DEFAULT_MASCOT_PHRASES.join('\n'))
    setNotice(null)
    setError(null)
  }

  if (loading) return <LoadingState message="Carregando frases do mascote" />

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900">Mascote</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Configure as frases exibidas no balão da sidebar.
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-zinc-900">Frases do balão</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Escreva uma frase por linha. Uma delas aparece aleatoriamente quando o mascote e exibido.
          </p>
        </div>

        <textarea
          value={phrasesText}
          onChange={(event) => setPhrasesText(event.target.value)}
          rows={8}
          className="w-full resize-none rounded-xl border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
          placeholder="Ex: Precisa de ajuda?"
        />

        <div className="mt-5 flex flex-col gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-end">
          
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-[#2F9E41] px-5 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar frases'}
          </button>
        </div>
      </section>

      {notice && <p className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</p>}
      {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  )
}
