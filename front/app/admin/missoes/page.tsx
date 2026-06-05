'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { LoadingState } from '@/app/components/LoadingScreen'

type Mission = {
  id: string
  title: string
  description: string | null
  type: string
  target_count: number
  xp_reward: number
  is_active: boolean
}

type WeeklySet = {
  id: string
  week_start: string
  bonus_xp: number
  is_active: boolean
  missions: Mission[]
}

const MISSION_TYPES = [
  { value: 'forum_votes',       label: 'Votos no fórum' },
  { value: 'comments',          label: 'Comentários' },
  { value: 'forum_replies',     label: 'Respostas no fórum' },
  { value: 'topics_created',    label: 'Tópicos criados' },
  { value: 'projects_created',  label: 'Projetos publicados' },
  { value: 'articles_created',  label: 'Artigos publicados' },
]

const inputCls = 'w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 transition'

function getMonday(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

export default function AdminMissoesPage() {
  const [tab, setTab] = useState<'missions' | 'sets'>('missions')
  const [missions, setMissions] = useState<Mission[]>([])
  const [sets, setSets] = useState<WeeklySet[]>([])
  const [loading, setLoading] = useState(true)

  // mission form
  const [mForm, setMForm] = useState({ title: '', description: '', type: 'forum_votes', target_count: 10, xp_reward: 50 })
  const [mSaving, setMSaving] = useState(false)
  const [mError, setMError] = useState<string | null>(null)

  // weekly set form
  const [sForm, setSForm] = useState({ week_start: getMonday(), bonus_xp: 100, selectedMissions: [] as string[] })
  const [sSaving, setSSaving] = useState(false)
  const [sError, setSError] = useState<string | null>(null)

  async function load() {
    const [{ data: ms }, { data: ss }] = await Promise.all([
      supabase.from('missions').select('*').order('created_at', { ascending: false }),
      supabase.from('weekly_mission_sets').select('*, weekly_set_missions(mission_id, missions(*))').order('week_start', { ascending: false }),
    ])
    setMissions((ms ?? []) as Mission[])
    setSets(((ss ?? []) as any[]).map(s => ({
      ...s,
      missions: (s.weekly_set_missions ?? []).map((wsm: any) => wsm.missions).filter(Boolean),
    })))
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function saveMission() {
    if (!mForm.title.trim()) { setMError('Título obrigatório'); return }
    setMSaving(true); setMError(null)
    const { error } = await supabase.from('missions').insert({
      title: mForm.title.trim(),
      description: mForm.description.trim() || null,
      type: mForm.type,
      target_count: mForm.target_count,
      xp_reward: mForm.xp_reward,
    })
    if (error) { setMError(error.message); setMSaving(false); return }
    setMForm({ title: '', description: '', type: 'forum_votes', target_count: 10, xp_reward: 50 })
    await load()
    setMSaving(false)
  }

  async function toggleMission(id: string, is_active: boolean) {
    await supabase.from('missions').update({ is_active }).eq('id', id)
    setMissions(prev => prev.map(m => m.id === id ? { ...m, is_active } : m))
  }

  async function deleteMission(id: string) {
    await supabase.from('missions').delete().eq('id', id)
    setMissions(prev => prev.filter(m => m.id !== id))
  }

  async function saveSet() {
    if (sForm.selectedMissions.length === 0) { setSError('Selecione pelo menos uma missão'); return }
    setSSaving(true); setSError(null)
    const { data: setData, error: setErr } = await supabase
      .from('weekly_mission_sets')
      .insert({ week_start: sForm.week_start, bonus_xp: sForm.bonus_xp })
      .select('id').single()
    if (setErr || !setData) { setSError(setErr?.message ?? 'Erro'); setSSaving(false); return }
    await supabase.from('weekly_set_missions').insert(
      sForm.selectedMissions.map(mid => ({ set_id: setData.id, mission_id: mid }))
    )
    setSForm({ week_start: getMonday(), bonus_xp: 100, selectedMissions: [] })
    await load()
    setSSaving(false)
  }

  async function toggleSet(id: string, is_active: boolean) {
    await supabase.from('weekly_mission_sets').update({ is_active }).eq('id', id)
    setSets(prev => prev.map(s => s.id === id ? { ...s, is_active } : s))
  }

  async function deleteSet(id: string) {
    await supabase.from('weekly_mission_sets').delete().eq('id', id)
    setSets(prev => prev.filter(s => s.id !== id))
  }

  if (loading) return <LoadingState message="Carregando missões" />

  const typeLabel = (type: string) => MISSION_TYPES.find(t => t.value === type)?.label ?? type

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900">Missões</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Crie missões e pacotes semanais com bônus de XP</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-zinc-200">
        {(['missions', 'sets'] as const).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${tab === t ? 'border-[#2F9E41] text-[#2F9E41]' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}>
            {t === 'missions' ? 'Missões' : 'Semanas'}
          </button>
        ))}
      </div>

      {tab === 'missions' && (
        <div className="flex flex-col gap-8">
          {/* Create mission */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="text-base font-semibold text-zinc-900 mb-4">Nova missão</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Título</label>
                <input value={mForm.title} onChange={e => setMForm(f => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="Ex: Vote 50 vezes no fórum" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Descrição (opcional)</label>
                <input value={mForm.description} onChange={e => setMForm(f => ({ ...f, description: e.target.value }))} className={inputCls} placeholder="Detalhes da missão..." />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Tipo de ação</label>
                <select value={mForm.type} onChange={e => setMForm(f => ({ ...f, type: e.target.value }))} className={inputCls}>
                  {MISSION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Meta</label>
                <input type="number" min={1} value={mForm.target_count} onChange={e => setMForm(f => ({ ...f, target_count: parseInt(e.target.value) || 1 }))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">XP individual</label>
                <input type="number" min={0} step={10} value={mForm.xp_reward} onChange={e => setMForm(f => ({ ...f, xp_reward: parseInt(e.target.value) || 0 }))} className={inputCls} />
              </div>
            </div>
            {mError && <p className="mt-3 text-sm text-red-600">{mError}</p>}
            <button onClick={saveMission} disabled={mSaving} className="mt-4 rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-50 transition" style={{ backgroundColor: '#2F9E41' }}>
              {mSaving ? 'Salvando...' : 'Criar missão'}
            </button>
          </div>

          {/* List */}
          <div className="flex flex-col gap-3">
            {missions.length === 0 && <p className="text-sm text-zinc-400 text-center py-8">Nenhuma missão criada.</p>}
            {missions.map(m => (
              <div key={m.id} className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900">{m.title}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{typeLabel(m.type)} · meta {m.target_count} · {m.xp_reward} XP</p>
                  {m.description && <p className="text-xs text-zinc-400 mt-0.5">{m.description}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggleMission(m.id, !m.is_active)} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition">
                    {m.is_active ? 'Ocultar' : 'Ativar'}
                  </button>
                  <button onClick={() => deleteMission(m.id)} className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition">
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'sets' && (
        <div className="flex flex-col gap-8">
          {/* Create set */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="text-base font-semibold text-zinc-900 mb-4">Nova semana</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Início da semana (segunda-feira)</label>
                <input type="date" value={sForm.week_start} onChange={e => setSForm(f => ({ ...f, week_start: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Bônus XP (completar todas)</label>
                <input type="number" min={0} step={50} value={sForm.bonus_xp} onChange={e => setSForm(f => ({ ...f, bonus_xp: parseInt(e.target.value) || 0 }))} className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-zinc-500 mb-2 block">Missões da semana</label>
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                  {missions.filter(m => m.is_active).map(m => (
                    <label key={m.id} className="flex items-center gap-2.5 cursor-pointer rounded-lg border border-zinc-100 px-3 py-2 hover:bg-zinc-50 transition">
                      <input type="checkbox" checked={sForm.selectedMissions.includes(m.id)}
                        onChange={e => setSForm(f => ({
                          ...f,
                          selectedMissions: e.target.checked ? [...f.selectedMissions, m.id] : f.selectedMissions.filter(id => id !== m.id)
                        }))}
                        className="accent-[#2F9E41]" />
                      <span className="text-sm text-zinc-800">{m.title}</span>
                      <span className="ml-auto text-xs text-zinc-400">{m.xp_reward} XP</span>
                    </label>
                  ))}
                  {missions.filter(m => m.is_active).length === 0 && (
                    <p className="text-sm text-zinc-400 py-2">Crie missões primeiro.</p>
                  )}
                </div>
              </div>
            </div>
            {sError && <p className="mt-3 text-sm text-red-600">{sError}</p>}
            <button onClick={saveSet} disabled={sSaving} className="mt-4 rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-50 transition" style={{ backgroundColor: '#2F9E41' }}>
              {sSaving ? 'Salvando...' : 'Criar semana'}
            </button>
          </div>

          {/* List */}
          <div className="flex flex-col gap-4">
            {sets.length === 0 && <p className="text-sm text-zinc-400 text-center py-8">Nenhuma semana criada.</p>}
            {sets.map(s => {
              const totalXp = s.missions.reduce((acc, m) => acc + m.xp_reward, 0) + s.bonus_xp
              return (
                <div key={s.id} className={`rounded-xl border bg-white p-4 ${s.is_active ? 'border-zinc-200' : 'border-zinc-100 opacity-60'}`}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        Semana de {new Date(s.week_start + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {s.missions.length} missão{s.missions.length !== 1 ? 'ões' : ''} · até {totalXp} XP no total
                        {s.bonus_xp > 0 && ` (inclui +${s.bonus_xp} XP bônus)`}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => toggleSet(s.id, !s.is_active)} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition">
                        {s.is_active ? 'Ocultar' : 'Ativar'}
                      </button>
                      <button onClick={() => deleteSet(s.id)} className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition">
                        Excluir
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {s.missions.map(m => (
                      <div key={m.id} className="flex items-center gap-2 text-xs text-zinc-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 shrink-0" />
                        {m.title} <span className="ml-auto">{m.xp_reward} XP</span>
                      </div>
                    ))}
                    {s.bonus_xp > 0 && (
                      <div className="flex items-center gap-2 text-xs font-semibold mt-1" style={{ color: '#2F9E41' }}>
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#2F9E41' }} />
                        Bônus (completar todas) <span className="ml-auto">+{s.bonus_xp} XP</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
