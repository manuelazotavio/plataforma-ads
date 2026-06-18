'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { LoadingState } from '@/app/components/LoadingScreen'
import { COURSE_SETTINGS_TABLE } from '@/app/lib/courseSettings'
import { DEFAULT_MASCOT_PHRASES, MASCOT_PHRASES_KEY, parseMascotPhrases } from '@/app/lib/mascotSettings'
import { supabase } from '@/app/lib/supabase'
import { useImageCropper } from '@/app/components/ImageCropper'

type Mascot = {
  id: string
  name: string
  description: string | null
  image_url: string
  min_xp: number
  display_order: number
  is_active: boolean
}

const RARITIES = [
  { level: 1, label: 'Comum',      min_xp: 0,    color: '#94a3b8', desc: 'Versão simples, sem efeitos, pose básica' },
  { level: 2, label: 'Incomum',    min_xp: 100,  color: '#4ade80', desc: 'Pequenos detalhes coloridos e um acessório' },
  { level: 3, label: 'Raro',       min_xp: 250,  color: '#60a5fa', desc: 'Elementos de código, brilho leve e pose mais marcante' },
  { level: 4, label: 'Épico',      min_xp: 500,  color: '#a855f7', desc: 'Aura, partículas, circuitos e detalhes tecnológicos' },
  { level: 5, label: 'Lendário',   min_xp: 900,  color: '#f59e0b', desc: 'Visual muito elaborado, iluminação forte' },
  { level: 6, label: 'Mítico',     min_xp: 1400, color: '#f97316', desc: 'Estética exclusiva, quase uma entidade especial' },
  { level: 7, label: 'Ultra Raro', min_xp: 2000, color: '#e11d48', desc: 'Design único, animações próprias e efeitos especiais' },
]

const inputCls = 'w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 transition'

function rarityFromXp(min_xp: number) {
  return [...RARITIES].reverse().find(r => min_xp >= r.min_xp) ?? RARITIES[0]
}

export default function AdminMascotePage() {
  const { cropImage, cropperNode } = useImageCropper('1:1')
  const [tab, setTab] = useState<'colecao' | 'frases'>('colecao')
  const [loading, setLoading] = useState(true)

 
  const [mascots, setMascots] = useState<Mascot[]>([])
  const [form, setForm] = useState({ name: '', description: '', rarity: 1, image_url: '' })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)


  const [phrasesText, setPhrasesText] = useState(DEFAULT_MASCOT_PHRASES.join('\n'))
  const [phrasesSaving, setPhrasesSaving] = useState(false)
  const [phrasesNotice, setPhrasesNotice] = useState<string | null>(null)
  const [phrasesError, setPhrasesError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [{ data: ms }, { data: settings }] = await Promise.all([
        supabase.from('mascots').select('*').order('display_order').order('min_xp'),
        supabase.from(COURSE_SETTINGS_TABLE).select('value').eq('key', MASCOT_PHRASES_KEY).maybeSingle(),
      ])
      setMascots((ms ?? []) as Mascot[])
      if (settings?.value) setPhrasesText(parseMascotPhrases(settings.value).join('\n'))
      setLoading(false)
    }
    void load()
  }, [])

  async function uploadImage(file: File) {
    setUploading(true)
    setFormError(null)
    const ext = file.name.split('.').pop()
    const path = `mascots/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) { setFormError('Erro ao enviar imagem: ' + error.message); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    setForm(f => ({ ...f, image_url: publicUrl }))
    setUploading(false)
  }

  async function selectImage(file: File) {
    const cropped = await cropImage(file)
    if (cropped) await uploadImage(cropped)
  }

  async function saveMascot() {
    if (!form.name.trim()) { setFormError('Nome obrigatório'); return }
    if (!form.image_url) { setFormError('Imagem obrigatória'); return }
    setSaving(true); setFormError(null)
    const rarity = RARITIES.find(r => r.level === form.rarity)!
    const { data, error } = await supabase.from('mascots').insert({
      name: form.name.trim(),
      description: form.description.trim() || null,
      image_url: form.image_url,
      min_xp: rarity.min_xp,
      display_order: mascots.length + 1,
    }).select('*').single()
    if (error) { setFormError(error.message); setSaving(false); return }
    setMascots(prev => [...prev, data as Mascot])
    setForm({ name: '', description: '', rarity: 1, image_url: '' })
    setSaving(false)
  }

  async function toggleActive(id: string, is_active: boolean) {
    await supabase.from('mascots').update({ is_active }).eq('id', id)
    setMascots(prev => prev.map(m => m.id === id ? { ...m, is_active } : m))
  }

  async function deleteMascot(id: string) {
    await supabase.from('mascots').delete().eq('id', id)
    setMascots(prev => prev.filter(m => m.id !== id))
  }

  async function savePhases() {
    const phrases = phrasesText.split('\n').map(p => p.trim()).filter(Boolean)
    if (!phrases.length) { setPhrasesError('Adicione pelo menos uma frase'); return }
    setPhrasesSaving(true); setPhrasesError(null); setPhrasesNotice(null)
    const { error } = await supabase.from(COURSE_SETTINGS_TABLE).upsert({
      key: MASCOT_PHRASES_KEY, value: JSON.stringify(phrases), updated_at: new Date().toISOString(),
    })
    if (error) { setPhrasesError(error.message) } else { setPhrasesNotice('Frases salvas.'); setPhrasesText(phrases.join('\n')) }
    setPhrasesSaving(false)
  }

  if (loading) return <LoadingState message="Carregando" />

  const selectedRarity = RARITIES.find(r => r.level === form.rarity)!

  return (
    <div className="mx-auto max-w-3xl">
      {cropperNode}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Personagem</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Gerencie a coleção de personagens e as frases do balão.</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-zinc-200">
        {(['colecao', 'frases'] as const).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${tab === t ? 'border-[#2F9E41] text-[#2F9E41]' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}>
            {t === 'colecao' ? 'Coleção' : 'Frases do balão'}
          </button>
        ))}
      </div>

      {tab === 'colecao' && (
        <div className="flex flex-col gap-8">
  
          <div className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="text-base font-semibold text-zinc-900 mb-5">Adicionar personagem</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-zinc-500 mb-1.5 block">Imagem</label>
                <div className="flex items-center gap-4">
                  <div
                    className="relative h-24 w-24 shrink-0 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 overflow-hidden cursor-pointer hover:border-[#2F9E41] transition"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {form.image_url ? (
                      <Image src={form.image_url} alt="preview" fill className="object-contain p-2" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-zinc-400 text-xs text-center px-2">
                        {uploading ? 'Enviando...' : 'Clique para enviar'}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()}
                      className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 transition">
                      {uploading ? 'Enviando...' : 'Escolher imagem'}
                    </button>
                    {form.image_url && (
                      <button type="button" onClick={() => setForm(f => ({ ...f, image_url: '' }))}
                        className="text-xs text-red-400 hover:text-red-600 transition text-left">
                        Remover
                      </button>
                    )}
                    <p className="text-xs text-zinc-400">PNG ou WebP com fundo transparente</p>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) void selectImage(f); e.target.value = '' }} />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1.5 block">Nome</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Ex: ADS Bot Dourado" />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1.5 block">Raridade / Nível</label>
                <select value={form.rarity} onChange={e => setForm(f => ({ ...f, rarity: parseInt(e.target.value) }))} className={inputCls}>
                  {RARITIES.map(r => (
                    <option key={r.level} value={r.level}>Nível {r.level} — {r.label} ({r.min_xp} XP)</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <div className="rounded-xl px-3 py-2.5 text-xs flex items-center gap-2" style={{ backgroundColor: selectedRarity.color + '18', borderColor: selectedRarity.color + '40', border: '1px solid' }}>
                  <span className="font-bold" style={{ color: selectedRarity.color }}>Nível {selectedRarity.level} · {selectedRarity.label}</span>
                  <span className="text-zinc-500">— {selectedRarity.desc}</span>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-zinc-500 mb-1.5 block">Descrição (opcional)</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls} placeholder="Breve descrição do personagem..." />
              </div>
            </div>

            {formError && <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{formError}</p>}

            <button onClick={saveMascot} disabled={saving || uploading}
              className="mt-5 rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-50 transition"
              style={{ backgroundColor: '#2F9E41' }}>
              {saving ? 'Salvando...' : 'Adicionar personagem'}
            </button>
          </div>

          
          <div className="flex flex-col gap-3">
            {mascots.length === 0 && <p className="text-sm text-zinc-400 text-center py-8">Nenhum personagem cadastrado.</p>}
            {mascots.map(m => {
              const rarity = rarityFromXp(m.min_xp)
              return (
                <div key={m.id} className={`flex items-center gap-4 rounded-2xl border bg-white p-4 ${m.is_active ? 'border-zinc-200' : 'border-zinc-100 opacity-60'}`}>
                  <div className="relative h-16 w-16 shrink-0 rounded-xl bg-zinc-50 border border-zinc-100 overflow-hidden">
                    <Image src={m.image_url} alt={m.name} fill className="object-contain p-1" sizes="64px" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-zinc-900">{m.name}</p>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: rarity.color + '20', color: rarity.color }}>
                        Nível {rarity.level} · {rarity.label}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">{m.min_xp} XP para desbloquear{m.description ? ` · ${m.description}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => toggleActive(m.id, !m.is_active)}
                      className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition">
                      {m.is_active ? 'Ocultar' : 'Ativar'}
                    </button>
                    <button onClick={() => deleteMascot(m.id)}
                      className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition">
                      Excluir
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'frases' && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-zinc-900">Frases do balão</h2>
            <p className="mt-1 text-sm text-zinc-500">Uma frase por linha. Uma delas aparece aleatoriamente.</p>
          </div>
          <textarea value={phrasesText} onChange={e => setPhrasesText(e.target.value)} rows={8}
            className="w-full resize-none rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
            placeholder="Ex: Precisa de ajuda?" />
          {phrasesError && <p className="mt-3 text-sm text-red-600">{phrasesError}</p>}
          {phrasesNotice && <p className="mt-3 text-sm text-green-700">{phrasesNotice}</p>}
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={savePhases} disabled={phrasesSaving}
              className="rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-50 transition"
              style={{ backgroundColor: '#2F9E41' }}>
              {phrasesSaving ? 'Salvando...' : 'Salvar frases'}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
