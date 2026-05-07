'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

type Level = { id: number; name: string; min_xp: number }

const XP_TABLE = [
  { label: 'Projeto criado',         xp: 50 },
  { label: 'Artigo publicado',       xp: 40 },
  { label: 'Tópico no fórum',        xp: 20 },
  { label: 'Comentário postado',     xp: 10 },
  { label: 'Like/reação recebida',   xp: 5  },
]

const emptyForm = { name: '', min_xp: '' }

export default function NiveisPage() {
  const [levels, setLevels] = useState<Level[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('levels').select('id, name, min_xp').order('min_xp', { ascending: true })
    setLevels(data ?? [])
    setLoading(false)
  }

  function openCreate() {
    setEditId(null)
    setForm(emptyForm)
    setSubmitted(false)
    setShowForm(true)
  }

  function openEdit(level: Level) {
    setEditId(level.id)
    setForm({ name: level.name, min_xp: String(level.min_xp) })
    setSubmitted(false)
    setShowForm(true)
  }

  function cancel() {
    setShowForm(false)
    setSubmitted(false)
    setForm(emptyForm)
    setEditId(null)
  }

  async function save() {
    setSubmitted(true)
    if (!form.name.trim() || form.min_xp === '') return
    setSaving(true)

    const payload = { name: form.name.trim(), min_xp: parseInt(form.min_xp) }

    if (editId !== null) {
      await supabase.from('levels').update(payload).eq('id', editId)
    } else {
      await supabase.from('levels').insert(payload)
    }

    await load()
    cancel()
    setSaving(false)
  }

  async function remove(id: number) {
    if (!confirm('Excluir este nível?')) return
    await supabase.from('levels').delete().eq('id', id)
    setLevels((prev) => prev.filter((l) => l.id !== id))
  }

  if (loading) return <p className="text-sm text-zinc-500">Carregando...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Níveis de usuário</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{levels.length} nível{levels.length !== 1 ? 'is' : ''} configurado{levels.length !== 1 ? 's' : ''}</p>
        </div>
        {!showForm && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition"
            style={{ backgroundColor: '#0B7A3B' }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            Novo nível
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">{editId !== null ? 'Editar nível' : 'Novo nível'}</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={submitted && !form.name.trim() ? inputError : input}
                placeholder="Ex: Explorador"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">
                XP mínimo <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                value={form.min_xp}
                onChange={(e) => setForm({ ...form, min_xp: e.target.value })}
                className={submitted && form.min_xp === '' ? inputError : input}
                placeholder="Ex: 100"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 transition"
              style={{ backgroundColor: '#0B7A3B' }}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button onClick={cancel} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden mb-8">
        {levels.length === 0 ? (
          <p className="text-sm text-zinc-400 px-5 py-8 text-center">Nenhum nível cadastrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 w-10">#</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Nome</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">XP mínimo</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">XP máximo</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {levels.map((level, i) => {
                const next = levels[i + 1]
                return (
                  <tr key={level.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50">
                    <td className="px-5 py-3.5 text-xs text-zinc-400 font-medium">{i + 1}</td>
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-zinc-900">{level.name}</span>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-600">{level.min_xp} XP</td>
                    <td className="px-5 py-3.5 text-zinc-400 text-xs">
                      {next ? `até ${next.min_xp - 1} XP` : 'sem limite'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(level)} className="text-xs text-zinc-400 hover:text-zinc-700 transition">Editar</button>
                        <button onClick={() => remove(level.id)} className="text-xs text-zinc-300 hover:text-red-500 transition">Excluir</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-5">
        <h2 className="text-sm font-semibold text-zinc-900 mb-1">Como o XP é calculado</h2>
        <p className="text-xs text-zinc-500 mb-4">Cada ação do usuário soma XP. Os pesos são fixos.</p>
        <div className="flex flex-col gap-2">
          {XP_TABLE.map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-xs text-zinc-600">{row.label}</span>
              <span className="text-xs font-semibold text-zinc-900">+{row.xp} XP</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const input = 'rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 transition w-full'
const inputError = 'rounded-lg border border-red-400 bg-red-50/30 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition w-full'
