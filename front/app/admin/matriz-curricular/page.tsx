'use client'

import { useEffect, useMemo, useState } from 'react'
import Select from '@/app/components/Select'
import { supabase } from '@/app/lib/supabase'
import {
  CURRICULUM_SUBJECTS_TABLE,
  DEFAULT_CURRICULUM,
  CurriculumSubject,
  curriculumTableSql,
  formatWorkloadHours,
  parseWorkloadHours,
} from '@/app/lib/curriculum'

type FormState = {
  semester: number
  name: string
  workload_hours: string
}

const emptyForm: FormState = {
  semester: 1,
  name: '',
  workload_hours: '',
}

const semesterOptions = Array.from({ length: 8 }, (_, index) => {
  const semester = index + 1
  return { value: String(semester), label: `${semester}º` }
})

export default function AdminMatrizCurricularPage() {
  const [subjects, setSubjects] = useState<CurriculumSubject[]>([])
  const [addForm, setAddForm] = useState<FormState>(emptyForm)
  const [editForm, setEditForm] = useState<FormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const grouped = useMemo(() => {
    const groups = new Map<number, CurriculumSubject[]>()
    for (const subject of subjects) {
      if (!groups.has(subject.semester)) groups.set(subject.semester, [])
      groups.get(subject.semester)!.push(subject)
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a - b)
  }, [subjects])

  const activeCount = useMemo(() => subjects.filter((subject) => subject.is_active).length, [subjects])

  async function loadSubjects() {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from(CURRICULUM_SUBJECTS_TABLE)
      .select('id, semester, name, workload_hours, display_order, is_active')
      .order('semester', { ascending: true })
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      setSubjects([])
      setError(error.message)
    } else {
      setSubjects((data as CurriculumSubject[]) ?? [])
    }

    setLoading(false)
  }

  useEffect(() => {
    void Promise.resolve().then(loadSubjects)
  }, [])

  async function addSubject(e: React.FormEvent) {
    e.preventDefault()
    const name = addForm.name.trim()
    if (!name) return
    const workload = parseWorkloadHours(addForm.workload_hours)
    if (workload !== null && (!Number.isFinite(workload) || workload <= 0)) {
      setError('Informe uma carga horária válida ou deixe o campo em branco.')
      return
    }
    setSaving(true)
    setError(null)
    setNotice(null)
    const nextOrder = subjects
      .filter((s) => s.semester === addForm.semester)
      .reduce((max, s) => Math.max(max, s.display_order ?? 0), 0) + 1
    const { error } = await supabase.from(CURRICULUM_SUBJECTS_TABLE).insert({
      semester: addForm.semester,
      name,
      workload_hours: workload,
      display_order: nextOrder,
      is_active: true,
    })
    if (error) {
      setError(error.message)
    } else {
      setNotice('Disciplina adicionada.')
      setAddForm(emptyForm)
      await loadSubjects()
    }
    setSaving(false)
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    const name = editForm.name.trim()
    if (!name || !editingId) return
    const workload = parseWorkloadHours(editForm.workload_hours)
    if (workload !== null && (!Number.isFinite(workload) || workload <= 0)) {
      setError('Informe uma carga horária válida ou deixe o campo em branco.')
      return
    }
    setSaving(true)
    setError(null)
    setNotice(null)
    const { error } = await supabase
      .from(CURRICULUM_SUBJECTS_TABLE)
      .update({ semester: editForm.semester, name, workload_hours: workload })
      .eq('id', editingId)
    if (error) {
      setError(error.message)
    } else {
      setNotice('Disciplina atualizada.')
      cancelEdit()
      await loadSubjects()
    }
    setSaving(false)
  }

  function startEdit(subject: CurriculumSubject) {
    setEditingId(subject.id)
    setNotice(null)
    setError(null)
    setEditForm({
      semester: subject.semester,
      name: subject.name,
      workload_hours: subject.workload_hours ? String(subject.workload_hours) : '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm(emptyForm)
    setError(null)
  }

  async function seedDefaultCurriculum() {
    setSaving(true)
    setError(null)
    setNotice(null)

    const current = new Set(subjects.map((subject) => `${subject.semester}:${subject.name.toLowerCase()}`))
    const rows = DEFAULT_CURRICULUM.flatMap((semester) =>
      semester.subjects
        .filter((subject) => !current.has(`${semester.semester}:${subject.name.toLowerCase()}`))
        .map((subject, index) => ({
          semester: semester.semester,
          name: subject.name,
          workload_hours: subject.workload_hours,
          display_order: index + 1,
          is_active: true,
        }))
    )

    if (rows.length === 0) {
      setNotice('A matriz padrão já está cadastrada.')
      setSaving(false)
      return
    }

    const { error } = await supabase.from(CURRICULUM_SUBJECTS_TABLE).insert(rows)

    if (error) {
      setError(error.message)
    } else {
      setNotice('Matriz padrão adicionada.')
      await loadSubjects()
    }

    setSaving(false)
  }

  async function toggleSubject(subject: CurriculumSubject) {
    setSaving(true)
    setError(null)
    setNotice(null)

    const { error } = await supabase
      .from(CURRICULUM_SUBJECTS_TABLE)
      .update({ is_active: !subject.is_active })
      .eq('id', subject.id)

    if (error) {
      setError(error.message)
    } else {
      setSubjects((prev) => prev.map((item) => (
        item.id === subject.id ? { ...item, is_active: !item.is_active } : item
      )))
    }

    setSaving(false)
  }

  async function removeSubject(subject: CurriculumSubject) {
    const confirmed = window.confirm(`Remover "${subject.name}" da matriz curricular?`)
    if (!confirmed) return

    setSaving(true)
    setError(null)
    setNotice(null)

    const { error } = await supabase
      .from(CURRICULUM_SUBJECTS_TABLE)
      .delete()
      .eq('id', subject.id)

    if (error) {
      setError(error.message)
    } else {
      setSubjects((prev) => prev.filter((item) => item.id !== subject.id))
      if (editingId === subject.id) cancelEdit()
    }

    setSaving(false)
  }

  async function moveSubject(semesterSubjects: CurriculumSubject[], index: number, direction: -1 | 1) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= semesterSubjects.length) return

    const current = semesterSubjects[index]
    const target = semesterSubjects[targetIndex]
    const currentOrder = current.display_order ?? index
    const targetOrder = target.display_order ?? targetIndex

    setSaving(true)
    setError(null)
    setNotice(null)

    const updates = await Promise.all([
      supabase.from(CURRICULUM_SUBJECTS_TABLE).update({ display_order: targetOrder }).eq('id', current.id),
      supabase.from(CURRICULUM_SUBJECTS_TABLE).update({ display_order: currentOrder }).eq('id', target.id),
    ])

    const updateError = updates.find((result) => result.error)?.error
    if (updateError) {
      setError(updateError.message)
    } else {
      await loadSubjects()
    }

    setSaving(false)
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Matriz curricular</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Configure as disciplinas exibidas na página do curso. {activeCount} ativa{activeCount !== 1 ? 's' : ''}.
          </p>
        </div>
        <button
          type="button"
          onClick={seedDefaultCurriculum}
          disabled={saving || loading}
          className="w-full cursor-pointer rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 sm:w-auto"
        >
          Usar matriz padrão
        </button>
      </div>

      {/* Modal de edição */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900">Editar disciplina</h2>
              <button type="button" onClick={cancelEdit} className="text-zinc-400 hover:text-zinc-700 transition">
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <line x1={18} y1={6} x2={6} y2={18} /><line x1={6} y1={6} x2={18} y2={18} />
                </svg>
              </button>
            </div>
            <form onSubmit={saveEdit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
                Semestre
                <Select
                  value={String(editForm.semester)}
                  onChange={(value) => setEditForm((prev) => ({ ...prev, semester: Number(value) }))}
                  options={semesterOptions}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
                Disciplina
                <input
                  type="text"
                  value={editForm.name}
                  autoFocus
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                  placeholder="Ex: Banco de Dados I"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
                Carga horária
                <input
                  type="text"
                  inputMode="decimal"
                  value={editForm.workload_hours}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, workload_hours: e.target.value }))}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                  placeholder="Ex: 66,7"
                />
              </label>
              {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={cancelEdit} className="cursor-pointer rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">
                  Cancelar
                </button>
                <button type="submit" disabled={saving || !editForm.name.trim()} className="cursor-pointer rounded-lg bg-[#2F9E41] px-5 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50">
                  {saving ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Formulário de adição */}
      <form onSubmit={addSubject} className="mb-5 grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 lg:grid-cols-[110px_1fr_140px_auto]">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
          Semestre
          <Select
            value={String(addForm.semester)}
            onChange={(value) => setAddForm((prev) => ({ ...prev, semester: Number(value) }))}
            options={semesterOptions}
          />
        </label>

        <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-zinc-500">
          Disciplina
          <input
            type="text"
            value={addForm.name}
            onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            placeholder="Ex: Banco de Dados I"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
          Carga horária
          <input
            type="text"
            inputMode="decimal"
            value={addForm.workload_hours}
            onChange={(e) => setAddForm((prev) => ({ ...prev, workload_hours: e.target.value }))}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            placeholder="Ex: 66,7"
          />
        </label>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <button
            type="submit"
            disabled={saving || !addForm.name.trim()}
            className="cursor-pointer rounded-lg bg-[#2F9E41] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            Adicionar
          </button>
        </div>
      </form>

      {notice && (
        <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {notice}
        </p>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">Não foi possível carregar ou salvar a matriz curricular.</p>
          <p className="mt-1 text-red-600">{error}</p>
          <p className="mt-4 text-red-600">
            Se a tabela ainda não existir no Supabase, execute este SQL uma vez:
          </p>
          <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-white p-3 text-xs text-zinc-700">
            {curriculumTableSql}
          </pre>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Carregando...</p>
      ) : subjects.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-10 text-center">
          <p className="text-sm font-medium text-zinc-900">Nenhuma disciplina configurada.</p>
          <p className="mt-1 text-sm text-zinc-500">Adicione manualmente ou use a matriz padrão.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {grouped.map(([semester, semesterSubjects]) => (
            <section key={semester} className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3">
                <h2 className="text-sm font-semibold text-zinc-900">{semester}º Semestre</h2>
              </div>

              {semesterSubjects.map((subject, index) => (
                <div
                  key={subject.id}
                  className="grid gap-3 border-b border-zinc-100 px-4 py-3 last:border-b-0 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4"
                >
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${subject.is_active ? 'text-zinc-900' : 'text-zinc-400'}`}>
                      {subject.name}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {subject.workload_hours ? `${formatWorkloadHours(subject.workload_hours)}h - ` : ''}
                      {subject.is_active ? 'Aparece na página do curso' : 'Oculta na página do curso'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1 sm:justify-end">
                    <button
                      type="button"
                      onClick={() => moveSubject(semesterSubjects, index, -1)}
                      disabled={saving || index === 0}
                      className="cursor-pointer rounded-lg border border-zinc-200 px-2 py-1.5 text-xs text-zinc-500 transition hover:bg-zinc-50 disabled:cursor-default disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSubject(semesterSubjects, index, 1)}
                      disabled={saving || index === semesterSubjects.length - 1}
                      className="cursor-pointer rounded-lg border border-zinc-200 px-2 py-1.5 text-xs text-zinc-500 transition hover:bg-zinc-50 disabled:cursor-default disabled:opacity-40"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(subject)}
                      disabled={saving}
                      className="cursor-pointer rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSubject(subject)}
                      disabled={saving}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-[11px] font-semibold transition disabled:opacity-50 ${
                        subject.is_active
                          ? 'border-green-200 text-green-700 hover:bg-green-50'
                          : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${subject.is_active ? 'bg-green-500' : 'bg-zinc-400'}`} />
                      {subject.is_active ? 'Ativa' : 'Oculta'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSubject(subject)}
                      disabled={saving}
                      className="cursor-pointer rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
