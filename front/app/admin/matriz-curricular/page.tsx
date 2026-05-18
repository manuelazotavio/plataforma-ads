'use client'

import { useEffect, useMemo, useState } from 'react'
import Select from '@/app/components/Select'
import RichTextEditor from '@/app/components/RichTextEditor'
import { supabase } from '@/app/lib/supabase'
import {
  CURRICULUM_SUBJECTS_TABLE,
  DEFAULT_CURRICULUM,
  CurriculumSubject,
  curriculumTableSql,
  formatWorkloadHours,
  parseWorkloadHours,
} from '@/app/lib/curriculum'

type Version = {
  id: string
  name: string
  year: number
  description: string | null
  is_current: boolean
}

type SubjectFull = CurriculumSubject & { version_id: string | null }

type EquivalencyMember = {
  id: string
  to_subject_id: string
  subject_name: string
  subject_version_name: string | null
}

type EquivalencyGroup = {
  id: string
  note: string | null
  members: EquivalencyMember[]
}

type FormState = { semester: number; name: string; abbreviation: string; workload_hours: string; version_id: string | null }

type PlanForm = {
  tipo: string
  n_docentes: string
  n_aulas_semanais: string
  total_aulas: string
  ch_ead: string
  ch_extensao: string
  ch_total: string
  abordagem_metodologica: string
  usa_laboratorio: boolean
  ch_laboratorio: string
  laboratorio_descricao: string
  nucleo_formacao: string
  grupo_conhecimentos: string
  ementa: string
  objectives: string
  content: string
  bibliography_basic: string
  bibliography_complementary: string
}

type ProfessorEntry = {
  id: string
  professor_id: string | null
  professor_name: string
  period: string | null
  display_order: number
}

type ProfessorOption = {
  id: string
  name: string
}

const emptyPlan: PlanForm = {
  tipo: '',
  n_docentes: '',
  n_aulas_semanais: '',
  total_aulas: '',
  ch_ead: '',
  ch_extensao: '',
  ch_total: '',
  abordagem_metodologica: '',
  usa_laboratorio: false,
  ch_laboratorio: '',
  laboratorio_descricao: '',
  nucleo_formacao: '',
  grupo_conhecimentos: '',
  ementa: '',
  objectives: '',
  content: '',
  bibliography_basic: '',
  bibliography_complementary: '',
}

const tipoOptions = [
  { value: 'Obrigatório', label: 'Obrigatório' },
  { value: 'Optativo', label: 'Optativo' },
  { value: 'Eletivo', label: 'Eletivo' },
]

const abordagemOptions = [
  { value: 'T', label: 'Teórica (T)' },
  { value: 'P', label: 'Prática (P)' },
  { value: 'T-P', label: 'Teórica-Prática (T/P)' },
]

function toNumOrNull(v: string): number | null {
  const t = v.trim().replace(',', '.')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

function toIntOrNull(v: string): number | null {
  const t = v.trim()
  if (!t) return null
  const n = parseInt(t, 10)
  return Number.isFinite(n) ? n : null
}

const emptyForm: FormState = { semester: 1, name: '', abbreviation: '', workload_hours: '', version_id: null }

const semesterOptions = Array.from({ length: 8 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}º`,
}))

export default function AdminMatrizCurricularPage() {
  const [versions, setVersions]   = useState<Version[]>([])
  const [subjects, setSubjects]   = useState<SubjectFull[]>([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [notice, setNotice]       = useState<string | null>(null)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null | 'unversioned'>('unversioned')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm]   = useState<FormState>(emptyForm)
  const [addForm, setAddForm]     = useState<FormState>(emptyForm)
  const [versionModal, setVersionModal] = useState<'create' | 'edit' | null>(null)
  const [editingVersion, setEditingVersion] = useState<Version | null>(null)
  const [versionForm, setVersionForm] = useState({ name: '', year: String(new Date().getFullYear()), description: '', is_current: false })
  const [bulkVersionId, setBulkVersionId]         = useState<string>('')
  const [openMenuId, setOpenMenuId]               = useState<string | null>(null)
  const [compareMode, setCompareMode]             = useState(false)
  const [compareVersionId, setCompareVersionId]   = useState<string>('')
  const [draggedSubjectId, setDraggedSubjectId]   = useState<string | null>(null)
  const [dropTargetId, setDropTargetId]           = useState<string | null>(null)
  const [compareEquivMap, setCompareEquivMap]     = useState<Record<string, EquivalencyGroup[]>>({})
  const [compareEquivLoading, setCompareEquivLoading] = useState(false)
  const [droppingGroup, setDroppingGroup]         = useState(false)
  const [planSubject, setPlanSubject]             = useState<SubjectFull | null>(null)
  const [planForm, setPlanForm]                   = useState<PlanForm>(emptyPlan)
  const [planProfessors, setPlanProfessors]       = useState<ProfessorEntry[]>([])
  const [newProfessors, setNewProfessors]         = useState<{ professor_id: string; name: string; period: string }[]>([])
  const [planNewProfInput, setPlanNewProfInput]   = useState({ professor_id: '', period: '' })
  const [professorOptions, setProfessorOptions]   = useState<ProfessorOption[]>([])
  const [planLoading, setPlanLoading]             = useState(false)
  const [planSaving, setPlanSaving]               = useState(false)

  const visibleSubjects = useMemo(() => {
    if (selectedVersionId === 'unversioned') return subjects.filter((s) => !s.version_id)
    return subjects.filter((s) => s.version_id === selectedVersionId)
  }, [subjects, selectedVersionId])

  const grouped = useMemo(() => {
    const map = new Map<number, SubjectFull[]>()
    for (const s of visibleSubjects) {
      if (!map.has(s.semester)) map.set(s.semester, [])
      map.get(s.semester)!.push(s)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b)
  }, [visibleSubjects])

  const activeCount = useMemo(() => visibleSubjects.filter((s) => s.is_active).length, [visibleSubjects])

  const allVersionOptions = useMemo(() => [
    { value: 'unversioned', label: 'Sem versão' },
    ...versions.map((v) => ({ value: v.id, label: `${v.name} (${v.year})` })),
  ], [versions])

  const compareVersionOptions = useMemo(() => {
    const opts = versions
      .filter((v) => v.id !== selectedVersionId)
      .map((v) => ({ value: v.id, label: `${v.name} (${v.year})` }))
    if (selectedVersionId !== 'unversioned') {
      opts.unshift({ value: 'unversioned', label: 'Sem versão' })
    }
    return opts
  }, [versions, selectedVersionId])

  const compareVersionSubjects = useMemo(() => {
    if (!compareVersionId) return []
    if (compareVersionId === 'unversioned') return subjects.filter((s) => !s.version_id)
    return subjects.filter((s) => s.version_id === compareVersionId)
  }, [subjects, compareVersionId])

  const compareGrouped = useMemo(() => {
    const map = new Map<number, SubjectFull[]>()
    for (const s of compareVersionSubjects) {
      if (!map.has(s.semester)) map.set(s.semester, [])
      map.get(s.semester)!.push(s)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b)
  }, [compareVersionSubjects])

  async function load() {
    setLoading(true)
    setError(null)
    const [{ data: vData }, { data: sData, error: sErr }] = await Promise.all([
      supabase.from('curriculum_versions').select('*').order('year', { ascending: false }),
      supabase
        .from(CURRICULUM_SUBJECTS_TABLE)
        .select('id, semester, name, abbreviation, workload_hours, display_order, is_active, version_id')
        .order('semester', { ascending: true })
        .order('display_order', { ascending: true })
        .order('name', { ascending: true }),
    ])
    setVersions((vData as Version[]) ?? [])
    if (sErr) { setError(sErr.message); setSubjects([]) }
    else setSubjects((sData as SubjectFull[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { void Promise.resolve().then(load) }, [])

  function openCreateVersion() {
    setEditingVersion(null)
    setVersionForm({ name: '', year: String(new Date().getFullYear()), description: '', is_current: false })
    setVersionModal('create')
  }

  function openEditVersion(v: Version) {
    setEditingVersion(v)
    setVersionForm({ name: v.name, year: String(v.year), description: v.description ?? '', is_current: v.is_current })
    setVersionModal('edit')
  }

  async function saveVersion(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      name: versionForm.name.trim(),
      year: Number(versionForm.year),
      description: versionForm.description.trim() || null,
      is_current: versionForm.is_current,
    }
    if (!payload.name || !payload.year) return
    setSaving(true)
    if (editingVersion) {
      await supabase.from('curriculum_versions').update(payload).eq('id', editingVersion.id)
    } else {
      const { data } = await supabase.from('curriculum_versions').insert(payload).select('id').single()
      if (data) setSelectedVersionId(data.id)
    }
    setVersionModal(null)
    await load()
    setSaving(false)
  }

  async function deleteVersion(v: Version) {
    if (!confirm(`Remover a versão "${v.name} (${v.year})"? As disciplinas vinculadas ficarão sem versão.`)) return
    setSaving(true)
    await supabase.from('curriculum_versions').delete().eq('id', v.id)
    if (selectedVersionId === v.id) setSelectedVersionId('unversioned')
    await load()
    setSaving(false)
  }

  async function addSubject(e: React.FormEvent) {
    e.preventDefault()
    const name = addForm.name.trim()
    if (!name) return
    const workload = parseWorkloadHours(addForm.workload_hours)
    if (workload !== null && (!Number.isFinite(workload) || workload <= 0)) {
      setError('Carga horária inválida.')
      return
    }
    setSaving(true)
    setError(null)
    setNotice(null)
    const nextOrder = visibleSubjects
      .filter((s) => s.semester === addForm.semester)
      .reduce((max, s) => Math.max(max, s.display_order ?? 0), 0) + 1
    const { error: err } = await supabase.from(CURRICULUM_SUBJECTS_TABLE).insert({
      semester: addForm.semester,
      name,
      abbreviation: addForm.abbreviation.trim() || null,
      workload_hours: workload,
      display_order: nextOrder,
      is_active: true,
      version_id: selectedVersionId === 'unversioned' ? null : selectedVersionId,
    })
    if (err) setError(err.message)
    else { setNotice('Disciplina adicionada.'); setAddForm(emptyForm); await load() }
    setSaving(false)
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    const name = editForm.name.trim()
    if (!name || !editingId) return
    const workload = parseWorkloadHours(editForm.workload_hours)
    if (workload !== null && (!Number.isFinite(workload) || workload <= 0)) {
      setError('Carga horária inválida.')
      return
    }
    setSaving(true)
    setError(null)
    const newVersionId = editForm.version_id === 'unversioned' ? null : editForm.version_id
    const { error: err } = await supabase
      .from(CURRICULUM_SUBJECTS_TABLE)
      .update({ semester: editForm.semester, name, abbreviation: editForm.abbreviation.trim() || null, workload_hours: workload, version_id: newVersionId })
      .eq('id', editingId)
    if (err) setError(err.message)
    else { setNotice('Disciplina atualizada.'); cancelEdit(); await load() }
    setSaving(false)
  }

  function startEdit(s: SubjectFull) {
    setEditingId(s.id)
    setNotice(null)
    setError(null)
    setEditForm({ semester: s.semester, name: s.name, abbreviation: s.abbreviation ?? '', workload_hours: s.workload_hours ? String(s.workload_hours) : '', version_id: s.version_id ?? 'unversioned' })
  }

  function cancelEdit() { setEditingId(null); setEditForm(emptyForm); setError(null) }

  async function bulkMoveToVersion() {
    if (!bulkVersionId || visibleSubjects.length === 0) return
    if (!confirm(`Mover ${visibleSubjects.length} disciplina(s) para esta versão?`)) return
    setSaving(true)
    const newVersionId = bulkVersionId === 'unversioned' ? null : bulkVersionId
    const ids = visibleSubjects.map((s) => s.id)
    const { error: err } = await supabase
      .from(CURRICULUM_SUBJECTS_TABLE)
      .update({ version_id: newVersionId })
      .in('id', ids)
    if (err) setError(err.message)
    else {
      setNotice('Disciplinas movidas.')
      setBulkVersionId('')
      await load()
    }
    setSaving(false)
  }

  async function toggleSubject(s: SubjectFull) {
    setSaving(true)
    const { error: err } = await supabase.from(CURRICULUM_SUBJECTS_TABLE).update({ is_active: !s.is_active }).eq('id', s.id)
    if (err) setError(err.message)
    else setSubjects((prev) => prev.map((x) => x.id === s.id ? { ...x, is_active: !s.is_active } : x))
    setSaving(false)
  }

  async function removeSubject(s: SubjectFull) {
    if (!confirm(`Remover "${s.name}"?`)) return
    setSaving(true)
    const { error: err } = await supabase.from(CURRICULUM_SUBJECTS_TABLE).delete().eq('id', s.id)
    if (err) setError(err.message)
    else {
      setSubjects((prev) => prev.filter((x) => x.id !== s.id))
      if (editingId === s.id) cancelEdit()
    }
    setSaving(false)
  }

  async function moveSubject(semesterSubjects: SubjectFull[], index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= semesterSubjects.length) return
    const cur = semesterSubjects[index]
    const tgt = semesterSubjects[target]
    setSaving(true)
    await Promise.all([
      supabase.from(CURRICULUM_SUBJECTS_TABLE).update({ display_order: tgt.display_order ?? target }).eq('id', cur.id),
      supabase.from(CURRICULUM_SUBJECTS_TABLE).update({ display_order: cur.display_order ?? index }).eq('id', tgt.id),
    ])
    await load()
    setSaving(false)
  }

  async function seedDefaultCurriculum() {
    setSaving(true)
    setError(null)
    setNotice(null)
    const current = new Set(visibleSubjects.map((s) => `${s.semester}:${s.name.toLowerCase()}`))
    const rows = DEFAULT_CURRICULUM.flatMap((sem) =>
      sem.subjects
        .filter((s) => !current.has(`${sem.semester}:${s.name.toLowerCase()}`))
        .map((s, i) => ({
          semester: sem.semester,
          name: s.name,
          workload_hours: s.workload_hours,
          display_order: i + 1,
          is_active: true,
          version_id: selectedVersionId === 'unversioned' ? null : selectedVersionId,
        }))
    )
    if (rows.length === 0) { setNotice('Matriz padrão já cadastrada.'); setSaving(false); return }
    const { error: err } = await supabase.from(CURRICULUM_SUBJECTS_TABLE).insert(rows)
    if (err) setError(err.message)
    else { setNotice('Matriz padrão adicionada.'); await load() }
    setSaving(false)
  }


  async function loadCompareEquivMap() {
    if (visibleSubjects.length === 0) { setCompareEquivMap({}); return }
    setCompareEquivLoading(true)
    const fromIds = visibleSubjects.map((s) => s.id)
    const { data: groups } = await supabase
      .from('curriculum_equivalency_groups')
      .select('id, note, from_subject_id, curriculum_equivalency_members(id, to_subject_id)')
      .in('from_subject_id', fromIds)

    if (groups && groups.length > 0) {
      const typedGroups = groups as {
        id: string
        note: string | null
        from_subject_id: string
        curriculum_equivalency_members: { id: string; to_subject_id: string }[]
      }[]
      const allMemberIds = typedGroups.flatMap((g) => g.curriculum_equivalency_members.map((m) => m.to_subject_id))
      const { data: memberSubjects } = await supabase
        .from(CURRICULUM_SUBJECTS_TABLE)
        .select('id, name, version_id')
        .in('id', allMemberIds)
      const versionMap = Object.fromEntries(versions.map((v) => [v.id, `${v.name} (${v.year})`]))
      const subjectMap = Object.fromEntries(
        ((memberSubjects ?? []) as { id: string; name: string; version_id: string | null }[]).map((s) => [
          s.id,
          { name: s.name, version_name: s.version_id ? (versionMap[s.version_id] ?? null) : null },
        ])
      )
      const map: Record<string, EquivalencyGroup[]> = {}
      for (const g of typedGroups) {
        if (!map[g.from_subject_id]) map[g.from_subject_id] = []
        map[g.from_subject_id].push({
          id: g.id,
          note: g.note,
          members: g.curriculum_equivalency_members.map((m) => ({
            id: m.id,
            to_subject_id: m.to_subject_id,
            subject_name: subjectMap[m.to_subject_id]?.name ?? '?',
            subject_version_name: subjectMap[m.to_subject_id]?.version_name ?? null,
          })),
        })
      }
      setCompareEquivMap(map)
    } else {
      setCompareEquivMap({})
    }
    setCompareEquivLoading(false)
  }

  async function handleDrop(fromSubjectId: string) {
    if (!draggedSubjectId || droppingGroup) return
    setDroppingGroup(true)
    setDropTargetId(null)
    const { data: group } = await supabase
      .from('curriculum_equivalency_groups')
      .insert({ from_subject_id: fromSubjectId })
      .select('id')
      .single()
    if (group) {
      await supabase.from('curriculum_equivalency_members').insert({
        group_id: group.id,
        to_subject_id: draggedSubjectId,
      })
    }
    setDraggedSubjectId(null)
    await loadCompareEquivMap()
    setDroppingGroup(false)
  }

  async function removeCompareEquiv(groupId: string, fromSubjectId: string) {
    if (!confirm('Remover esta equivalência?')) return
    await supabase.from('curriculum_equivalency_groups').delete().eq('id', groupId)
    setCompareEquivMap((prev) => ({
      ...prev,
      [fromSubjectId]: (prev[fromSubjectId] ?? []).filter((g) => g.id !== groupId),
    }))
  }

  async function openPlanModal(subject: SubjectFull) {
    setPlanSubject(subject)
    setPlanLoading(true)
    setPlanForm(emptyPlan)
    setPlanProfessors([])
    setNewProfessors([])
    setPlanNewProfInput({ professor_id: '', period: '' })
    const [{ data: plan }, { data: profs }, { data: profList }] = await Promise.all([
      supabase.from('curriculum_subject_plans').select('*').eq('subject_id', subject.id).maybeSingle(),
      supabase.from('curriculum_subject_professors').select('*').eq('subject_id', subject.id).order('display_order'),
      supabase.from('professors').select('id, name').order('name', { ascending: true }),
    ])
    setProfessorOptions((profList ?? []) as ProfessorOption[])
    if (plan) {
      const p = plan as Record<string, unknown>
      const str = (k: string) => (p[k] == null ? '' : String(p[k]))
      setPlanForm({
        tipo: str('tipo'),
        n_docentes: str('n_docentes'),
        n_aulas_semanais: str('n_aulas_semanais'),
        total_aulas: str('total_aulas'),
        ch_ead: str('ch_ead'),
        ch_extensao: str('ch_extensao'),
        ch_total: str('ch_total'),
        abordagem_metodologica: str('abordagem_metodologica'),
        usa_laboratorio: Boolean(p['usa_laboratorio']),
        ch_laboratorio: str('ch_laboratorio'),
        laboratorio_descricao: str('laboratorio_descricao'),
        nucleo_formacao: str('nucleo_formacao'),
        grupo_conhecimentos: str('grupo_conhecimentos'),
        ementa: str('ementa'),
        objectives: str('objectives'),
        content: str('content'),
        bibliography_basic: str('bibliography_basic'),
        bibliography_complementary: str('bibliography_complementary'),
      })
    }
    setPlanProfessors((profs ?? []) as ProfessorEntry[])
    setPlanLoading(false)
  }

  function closePlanModal() {
    setPlanSubject(null)
    setPlanForm(emptyPlan)
    setPlanProfessors([])
    setNewProfessors([])
    setPlanNewProfInput({ professor_id: '', period: '' })
  }

  async function savePlan(e: React.FormEvent) {
    e.preventDefault()
    if (!planSubject) return
    setPlanSaving(true)
    await supabase.from('curriculum_subject_plans').upsert({
      subject_id: planSubject.id,
      tipo: planForm.tipo.trim() || null,
      n_docentes: toIntOrNull(planForm.n_docentes),
      n_aulas_semanais: toIntOrNull(planForm.n_aulas_semanais),
      total_aulas: toIntOrNull(planForm.total_aulas),
      ch_ead: toNumOrNull(planForm.ch_ead),
      ch_extensao: toNumOrNull(planForm.ch_extensao),
      ch_total: toNumOrNull(planForm.ch_total),
      abordagem_metodologica: planForm.abordagem_metodologica.trim() || null,
      usa_laboratorio: planForm.usa_laboratorio,
      ch_laboratorio: planForm.usa_laboratorio ? toNumOrNull(planForm.ch_laboratorio) : null,
      laboratorio_descricao: planForm.usa_laboratorio ? (planForm.laboratorio_descricao.trim() || null) : null,
      nucleo_formacao: planForm.nucleo_formacao.trim() || null,
      grupo_conhecimentos: planForm.grupo_conhecimentos.trim() || null,
      ementa: planForm.ementa.trim() || null,
      objectives: planForm.objectives.trim() || null,
      content: planForm.content.trim() || null,
      bibliography_basic: planForm.bibliography_basic.trim() || null,
      bibliography_complementary: planForm.bibliography_complementary.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'subject_id' })
    const allProfs = [
      ...planProfessors.map((p) => ({ professor_id: p.professor_id, professor_name: p.professor_name, period: p.period })),
      ...newProfessors.map((p) => ({ professor_id: p.professor_id, professor_name: p.name, period: p.period || null })),
    ]
    await supabase.from('curriculum_subject_professors').delete().eq('subject_id', planSubject.id)
    if (allProfs.length > 0) {
      await supabase.from('curriculum_subject_professors').insert(
        allProfs.map((p, i) => ({
          subject_id: planSubject.id,
          professor_id: p.professor_id,
          professor_name: p.professor_name,
          period: p.period,
          display_order: i,
        }))
      )
    }
    closePlanModal()
    setNotice('Plano de ensino salvo.')
    setPlanSaving(false)
  }

  function enterCompareMode() {
    setCompareMode(true)
    setCompareVersionId('')
    setCompareEquivMap({})
  }

  function exitCompareMode() {
    setCompareMode(false)
    setCompareVersionId('')
    setDraggedSubjectId(null)
    setDropTargetId(null)
    setCompareEquivMap({})
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Matriz curricular</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {activeCount} disciplina{activeCount !== 1 ? 's' : ''} ativa{activeCount !== 1 ? 's' : ''} nesta versão.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!compareMode && (
            <>
              <button
                type="button"
                onClick={seedDefaultCurriculum}
                disabled={saving || loading}
                className="cursor-pointer rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
              >
                Usar matriz padrão
              </button>
              <button
                type="button"
                onClick={openCreateVersion}
                className="cursor-pointer rounded-lg bg-[#2F9E41] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                + Nova versão
              </button>
            </>
          )}
          <button
            type="button"
            onClick={compareMode ? exitCompareMode : enterCompareMode}
            className={`cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition ${
              compareMode
                ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            {compareMode ? 'Sair da comparação' : 'Comparar equivalências'}
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-1 border-b border-zinc-200 pb-0">
        <button
          type="button"
          onClick={() => { setSelectedVersionId('unversioned'); if (compareMode) { setCompareEquivMap({}); setCompareVersionId('') } }}
          className={`rounded-t-lg border border-b-0 px-4 py-2 text-sm font-medium transition ${
            selectedVersionId === 'unversioned'
              ? 'border-zinc-200 bg-white text-zinc-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-700'
          }`}
        >
          Sem versão
        </button>
        {versions.map((v) => (
          <div key={v.id} className="flex items-center">
            <button
              type="button"
              onClick={() => { setSelectedVersionId(v.id); if (compareMode) { setCompareEquivMap({}); setCompareVersionId('') } }}
              className={`rounded-t-lg border border-b-0 px-4 py-2 text-sm font-medium transition ${
                selectedVersionId === v.id
                  ? 'border-zinc-200 bg-white text-zinc-900'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {v.name} ({v.year})
              {v.is_current && (
                <span className="ml-1.5 rounded-full bg-[#2F9E41]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#2F9E41]">atual</span>
              )}
            </button>
            {selectedVersionId === v.id && !compareMode && (
              <div className="relative pl-1">
                <button
                  type="button"
                  onClick={() => setOpenMenuId(openMenuId === `ver-${v.id}` ? null : `ver-${v.id}`)}
                  className="cursor-pointer rounded p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                >
                  <svg width={14} height={14} viewBox="0 0 16 16" fill="currentColor">
                    <circle cx={8} cy={2} r={1.5} /><circle cx={8} cy={8} r={1.5} /><circle cx={8} cy={14} r={1.5} />
                  </svg>
                </button>
                {openMenuId === `ver-${v.id}` && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                    <div className="absolute left-0 top-8 z-20 w-36 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
                      <button
                        type="button"
                        onClick={() => { openEditVersion(v); setOpenMenuId(null) }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                      >
                        <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M11 2l3 3-8 8H3v-3L11 2z" /></svg>
                        Editar
                      </button>
                      <div className="my-1 border-t border-zinc-100" />
                      <button
                        type="button"
                        onClick={() => { deleteVersion(v); setOpenMenuId(null) }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9" /></svg>
                        Remover
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

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
                <Select value={String(editForm.semester)} onChange={(v) => setEditForm((p) => ({ ...p, semester: Number(v) }))} options={semesterOptions} />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
                Disciplina
                <input autoFocus type="text" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                  placeholder="Ex: Banco de Dados I" />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
                Sigla <span className="font-normal text-zinc-400">(opcional)</span>
                <input type="text" value={editForm.abbreviation} onChange={(e) => setEditForm((p) => ({ ...p, abbreviation: e.target.value }))}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                  placeholder="Ex: BDI" />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
                Carga horária
                <input type="text" inputMode="decimal" value={editForm.workload_hours} onChange={(e) => setEditForm((p) => ({ ...p, workload_hours: e.target.value }))}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                  placeholder="Ex: 66,7" />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
                Versão
                <Select
                  value={editForm.version_id ?? 'unversioned'}
                  onChange={(v) => setEditForm((p) => ({ ...p, version_id: v }))}
                  options={allVersionOptions}
                />
              </label>
              {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={cancelEdit} className="cursor-pointer rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">Cancelar</button>
                <button type="submit" disabled={saving || !editForm.name.trim()} className="cursor-pointer rounded-lg bg-[#2F9E41] px-5 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50">
                  {saving ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {versionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900">{versionModal === 'create' ? 'Nova versão' : 'Editar versão'}</h2>
              <button type="button" onClick={() => setVersionModal(null)} className="text-zinc-400 hover:text-zinc-700 transition">
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <line x1={18} y1={6} x2={6} y2={18} /><line x1={6} y1={6} x2={18} y2={18} />
                </svg>
              </button>
            </div>
            <form onSubmit={saveVersion} className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
                  Nome
                  <input autoFocus type="text" value={versionForm.name} onChange={(e) => setVersionForm((p) => ({ ...p, name: e.target.value }))}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                    placeholder="Ex: Matriz 2024" />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
                  Ano
                  <input type="number" value={versionForm.year} onChange={(e) => setVersionForm((p) => ({ ...p, year: e.target.value }))}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                    placeholder="2024" />
                </label>
              </div>
              <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
                Descrição (opcional)
                <input type="text" value={versionForm.description} onChange={(e) => setVersionForm((p) => ({ ...p, description: e.target.value }))}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                  placeholder="Ex: Resolução XXXXX/2024" />
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
                <input type="checkbox" checked={versionForm.is_current} onChange={(e) => setVersionForm((p) => ({ ...p, is_current: e.target.checked }))} />
                Marcar como versão atual (exibida no site)
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setVersionModal(null)} className="cursor-pointer rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">Cancelar</button>
                <button type="submit" disabled={saving || !versionForm.name.trim()} className="cursor-pointer rounded-lg bg-[#2F9E41] px-5 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50">
                  {saving ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {planSubject && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-6">
          <div className="relative my-auto w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-white px-6 py-4 rounded-t-2xl">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">Plano de Ensino</h2>
                <p className="text-sm text-zinc-500">
                  {planSubject.name}
                  {planSubject.workload_hours ? (
                    <span className="ml-2 text-xs text-zinc-400">— C.H. Ensino: {formatWorkloadHours(planSubject.workload_hours)}h</span>
                  ) : null}
                </p>
              </div>
              <button type="button" onClick={closePlanModal} className="text-zinc-400 transition hover:text-zinc-700">
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <line x1={18} y1={6} x2={6} y2={18} /><line x1={6} y1={6} x2={18} y2={18} />
                </svg>
              </button>
            </div>
            {planLoading ? (
              <div className="px-6 py-8">
                <p className="text-sm text-zinc-400">Carregando...</p>
              </div>
            ) : (
              <form onSubmit={savePlan} className="flex flex-col gap-6 px-6 py-5">

                <section>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">1. Identificação</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
                      Tipo
                      <Select
                        value={planForm.tipo}
                        onChange={(v) => setPlanForm((p) => ({ ...p, tipo: v }))}
                        options={tipoOptions}
                        placeholder="Selecionar..."
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
                      Nº docentes
                      <input type="number" min={0} value={planForm.n_docentes} onChange={(e) => setPlanForm((p) => ({ ...p, n_docentes: e.target.value }))}
                        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
                      Nº aulas semanais
                      <input type="number" min={0} value={planForm.n_aulas_semanais} onChange={(e) => setPlanForm((p) => ({ ...p, n_aulas_semanais: e.target.value }))}
                        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
                      Total de aulas
                      <input type="number" min={0} value={planForm.total_aulas} onChange={(e) => setPlanForm((p) => ({ ...p, total_aulas: e.target.value }))}
                        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
                      C.H. EaD (h)
                      <input type="text" inputMode="decimal" value={planForm.ch_ead} onChange={(e) => setPlanForm((p) => ({ ...p, ch_ead: e.target.value }))}
                        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
                      C.H. Extensão (h)
                      <input type="text" inputMode="decimal" value={planForm.ch_extensao} onChange={(e) => setPlanForm((p) => ({ ...p, ch_extensao: e.target.value }))}
                        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
                      Total de horas
                      <input type="text" inputMode="decimal" value={planForm.ch_total} onChange={(e) => setPlanForm((p) => ({ ...p, ch_total: e.target.value }))}
                        placeholder="Ex: 66,7"
                        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
                      Abordagem
                      <Select
                        value={planForm.abordagem_metodologica}
                        onChange={(v) => setPlanForm((p) => ({ ...p, abordagem_metodologica: v }))}
                        options={abordagemOptions}
                        placeholder="Selecionar..."
                      />
                    </label>
                  </div>
                  <div className="mt-3 flex flex-col gap-2 rounded-lg border border-zinc-200 px-3 py-2">
                    <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={planForm.usa_laboratorio}
                        onChange={(e) => setPlanForm((p) => ({ ...p, usa_laboratorio: e.target.checked }))}
                      />
                      Uso de laboratório ou outros ambientes além da sala de aula?
                    </label>
                    {planForm.usa_laboratorio && (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px]">
                        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
                          Qual(is) laboratório/ambiente
                          <input type="text" value={planForm.laboratorio_descricao} onChange={(e) => setPlanForm((p) => ({ ...p, laboratorio_descricao: e.target.value }))}
                            placeholder="Ex: Laboratório de Informática de 40 máquinas"
                            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200" />
                        </label>
                        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
                          C.H. laboratório (h)
                          <input type="text" inputMode="decimal" value={planForm.ch_laboratorio} onChange={(e) => setPlanForm((p) => ({ ...p, ch_laboratorio: e.target.value }))}
                            placeholder="Ex: 66,67"
                            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200" />
                        </label>
                      </div>
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">2. Grupos de Conhecimentos Essenciais</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
                      Núcleo de Formação
                      <input type="text" value={planForm.nucleo_formacao} onChange={(e) => setPlanForm((p) => ({ ...p, nucleo_formacao: e.target.value }))}
                        placeholder="Ex: Geral"
                        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
                      Grupo de Conhecimentos
                      <input type="text" value={planForm.grupo_conhecimentos} onChange={(e) => setPlanForm((p) => ({ ...p, grupo_conhecimentos: e.target.value }))}
                        placeholder="Ex: Administração, Empreendedorismo e Temas Transversais"
                        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200" />
                    </label>
                  </div>
                </section>

                {([
                  { key: 'ementa', label: '3. Ementa' },
                  { key: 'objectives', label: '4. Objetivos' },
                  { key: 'content', label: '5. Conteúdo Programático' },
                  { key: 'bibliography_basic', label: '6. Bibliografia Básica' },
                  { key: 'bibliography_complementary', label: '7. Bibliografia Complementar' },
                ] as const).map(({ key, label }) => (
                  <section key={key}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">{label}</h3>
                    <RichTextEditor
                      value={planForm[key]}
                      onChange={(html) => setPlanForm((p) => ({ ...p, [key]: html }))}
                      placeholder={`${label.replace(/^\d+\. /, '')}...`}
                      minHeightClass="min-h-32"
                    />
                  </section>
                ))}

                <div className="border-t border-zinc-100 pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Histórico de Professores</p>
                  {(planProfessors.length > 0 || newProfessors.length > 0) && (
                    <div className="mb-3 flex flex-col gap-1.5">
                      {planProfessors.map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2">
                          <p className="text-sm font-medium text-zinc-800">{p.professor_name}</p>
                          <div className="flex items-center gap-2">
                            {p.period && <span className="text-xs text-zinc-400">{p.period}</span>}
                            <button
                              type="button"
                              onClick={() => setPlanProfessors((prev) => prev.filter((x) => x.id !== p.id))}
                              className="text-zinc-300 transition hover:text-red-500"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                      {newProfessors.map((p, i) => (
                        <div key={`new-${i}`} className="flex items-center justify-between gap-3 rounded-lg border border-green-100 bg-green-50 px-3 py-2">
                          <p className="text-sm font-medium text-zinc-800">{p.name}</p>
                          <div className="flex items-center gap-2">
                            {p.period && <span className="text-xs text-zinc-400">{p.period}</span>}
                            <button
                              type="button"
                              onClick={() => setNewProfessors((prev) => prev.filter((_, j) => j !== i))}
                              className="text-zinc-300 transition hover:text-red-500"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {(() => {
                    const usedIds = new Set<string>([
                      ...planProfessors.map((p) => p.professor_id).filter(Boolean) as string[],
                      ...newProfessors.map((p) => p.professor_id),
                    ])
                    const availableOptions = professorOptions
                      .filter((p) => !usedIds.has(p.id))
                      .map((p) => ({ value: p.id, label: p.name }))
                    const selectedProf = professorOptions.find((p) => p.id === planNewProfInput.professor_id)
                    return (
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Select
                            value={planNewProfInput.professor_id}
                            onChange={(v) => setPlanNewProfInput((p) => ({ ...p, professor_id: v }))}
                            options={availableOptions}
                            placeholder={availableOptions.length === 0 ? 'Todos os professores já foram adicionados' : 'Selecionar professor...'}
                            disabled={availableOptions.length === 0}
                          />
                        </div>
                        <input
                          type="text"
                          value={planNewProfInput.period}
                          onChange={(e) => setPlanNewProfInput((p) => ({ ...p, period: e.target.value }))}
                          placeholder="Período (ex: 2023.1)"
                          className="w-36 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                        />
                        <button
                          type="button"
                          disabled={!selectedProf}
                          onClick={() => {
                            if (!selectedProf) return
                            setNewProfessors((prev) => [...prev, {
                              professor_id: selectedProf.id,
                              name: selectedProf.name,
                              period: planNewProfInput.period.trim(),
                            }])
                            setPlanNewProfInput({ professor_id: '', period: '' })
                          }}
                          className="cursor-pointer rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                        >
                          + Adicionar
                        </button>
                      </div>
                    )
                  })()}
                  {professorOptions.length === 0 && (
                    <p className="mt-2 text-xs text-zinc-400">
                      Nenhum professor cadastrado no corpo docente. Cadastre primeiro em /admin/corpo-docente.
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={closePlanModal} className="cursor-pointer rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">Cancelar</button>
                  <button type="submit" disabled={planSaving} className="cursor-pointer rounded-lg bg-[#2F9E41] px-5 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50">
                    {planSaving ? 'Salvando…' : 'Salvar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {!compareMode && (
        <form onSubmit={addSubject} className="mb-5 grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 lg:grid-cols-[110px_1fr_100px_140px_auto]">
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
            Semestre
            <Select value={String(addForm.semester)} onChange={(v) => setAddForm((p) => ({ ...p, semester: Number(v) }))} options={semesterOptions} />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-zinc-500">
            Disciplina
            <input type="text" value={addForm.name} onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              placeholder="Ex: Banco de Dados I" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
            Sigla
            <input type="text" value={addForm.abbreviation} onChange={(e) => setAddForm((p) => ({ ...p, abbreviation: e.target.value }))}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              placeholder="Ex: BDI" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
            Carga horária
            <input type="text" inputMode="decimal" value={addForm.workload_hours} onChange={(e) => setAddForm((p) => ({ ...p, workload_hours: e.target.value }))}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              placeholder="Ex: 66,7" />
          </label>
          <div className="flex items-end">
            <button type="submit" disabled={saving || !addForm.name.trim()}
              className="w-full cursor-pointer rounded-lg bg-[#2F9E41] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50">
              Adicionar
            </button>
          </div>
        </form>
      )}

      {selectedVersionId === 'unversioned' && !compareMode && visibleSubjects.length > 0 && versions.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
          <span className="text-sm text-amber-800">Mover todas ({visibleSubjects.length}) para:</span>
          <div className="w-52">
            <Select
              value={bulkVersionId}
              onChange={setBulkVersionId}
              options={versions.map((v) => ({ value: v.id, label: `${v.name} (${v.year})` }))}
              placeholder="Selecionar versão..."
            />
          </div>
          <button
            type="button"
            onClick={bulkMoveToVersion}
            disabled={!bulkVersionId || saving}
            className="cursor-pointer rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
          >
            Mover
          </button>
        </div>
      )}

      {notice && <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</p>}
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">Erro</p>
          <p className="mt-1 text-red-600">{error}</p>
          <p className="mt-4 text-red-600">Se a tabela ainda não existir no Supabase, execute este SQL:</p>
          <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-white p-3 text-xs text-zinc-700">{curriculumTableSql}</pre>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Carregando...</p>
      ) : compareMode ? (
        <div>
          <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <span className="text-sm font-medium text-blue-800">Comparar com:</span>
            <div className="w-56">
              <Select
                value={compareVersionId}
                onChange={(v) => {
                  setCompareVersionId(v)
                  setCompareEquivMap({})
                  void Promise.resolve().then(loadCompareEquivMap)
                }}
                options={compareVersionOptions}
                placeholder="Selecionar versão..."
              />
            </div>
            {compareEquivLoading && <span className="text-xs text-blue-500">Carregando...</span>}
            {droppingGroup && <span className="text-xs text-blue-500">Salvando...</span>}
            {compareVersionId && !compareEquivLoading && (
              <span className="text-xs text-blue-500">
                Arraste disciplinas da direita e solte sobre as da esquerda para criar equivalências.
              </span>
            )}
          </div>

          {!compareVersionId ? (
            <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-14 text-center">
              <p className="text-sm font-medium text-zinc-700">Selecione uma versão para comparar</p>
              <p className="mt-1 text-sm text-zinc-400">As disciplinas da versão selecionada aparecerão no lado direito e poderão ser arrastadas.</p>
            </div>
          ) : visibleSubjects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-10 text-center">
              <p className="text-sm text-zinc-500">Nenhuma disciplina na versão atual para mapear.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-3 px-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Esta versão — zona de destino
                </p>
                <div className="flex flex-col gap-1">
                  {grouped.map(([semester, subs]) => (
                    <div key={semester} className="mb-2">
                      <p className="mb-1 px-1 text-[11px] font-semibold text-zinc-400">{semester}º Semestre</p>
                      {subs.map((sub) => {
                        const equivs = compareEquivMap[sub.id] ?? []
                        const isDrop = dropTargetId === sub.id
                        return (
                          <div
                            key={sub.id}
                            onDragOver={(e) => { e.preventDefault(); setDropTargetId(sub.id) }}
                            onDragLeave={(e) => {
                              if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTargetId(null)
                            }}
                            onDrop={(e) => { e.preventDefault(); void handleDrop(sub.id) }}
                            className={`mb-1 min-h-[54px] rounded-xl border-2 p-3 transition-colors ${
                              isDrop
                                ? 'border-green-400 bg-green-50'
                                : 'border-dashed border-zinc-200 bg-white hover:border-zinc-300'
                            }`}
                          >
                            <p className="text-sm font-medium text-zinc-800">{sub.name}</p>
                            {equivs.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {equivs.map((g) => (
                                  <span
                                    key={g.id}
                                    className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700"
                                  >
                                    {g.members.map((m) => m.subject_name).join(' + ')}
                                    <button
                                      type="button"
                                      onClick={() => void removeCompareEquiv(g.id, sub.id)}
                                      className="ml-0.5 text-blue-400 hover:text-blue-700 leading-none"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 px-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Versão comparada — arraste daqui
                </p>
                {compareVersionSubjects.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-10 text-center">
                    <p className="text-sm text-zinc-400">Nenhuma disciplina nesta versão.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {compareGrouped.map(([semester, subs]) => (
                      <div key={semester} className="mb-2">
                        <p className="mb-1 px-1 text-[11px] font-semibold text-zinc-400">{semester}º Semestre</p>
                        {subs.map((sub) => (
                          <div
                            key={sub.id}
                            draggable
                            onDragStart={() => setDraggedSubjectId(sub.id)}
                            onDragEnd={() => { setDraggedSubjectId(null); setDropTargetId(null) }}
                            className={`mb-1 cursor-grab select-none rounded-xl border border-zinc-200 bg-white p-3 transition active:cursor-grabbing ${
                              draggedSubjectId === sub.id
                                ? 'border-dashed opacity-40'
                                : 'hover:border-zinc-300 hover:shadow-sm'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <svg className="h-3.5 w-3.5 shrink-0 text-zinc-300" viewBox="0 0 16 16" fill="currentColor">
                                <circle cx={5} cy={4} r={1.5} />
                                <circle cx={5} cy={8} r={1.5} />
                                <circle cx={5} cy={12} r={1.5} />
                                <circle cx={11} cy={4} r={1.5} />
                                <circle cx={11} cy={8} r={1.5} />
                                <circle cx={11} cy={12} r={1.5} />
                              </svg>
                              <p className="text-sm font-medium text-zinc-800">{sub.name}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : visibleSubjects.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-10 text-center">
          <p className="text-sm font-medium text-zinc-900">Nenhuma disciplina nesta versão.</p>
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
                <div key={subject.id} className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${subject.is_active ? 'text-zinc-900' : 'text-zinc-400'}`}>
                      {subject.abbreviation && (
                        <span className="mr-2 rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-mono text-zinc-500">{subject.abbreviation}</span>
                      )}
                      {subject.name}
                    </p>
                    {subject.workload_hours ? (
                      <p className="mt-0.5 text-xs text-zinc-400">{formatWorkloadHours(subject.workload_hours)}h</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleSubject(subject)}
                      disabled={saving}
                      className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition disabled:opacity-50 ${
                        subject.is_active ? 'border-green-200 text-green-700 hover:bg-green-50' : 'border-zinc-200 text-zinc-400 hover:bg-zinc-50'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${subject.is_active ? 'bg-green-500' : 'bg-zinc-300'}`} />
                      {subject.is_active ? 'Ativa' : 'Oculta'}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(subject)}
                      disabled={saving}
                      className="cursor-pointer rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
                    >
                      Editar
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setOpenMenuId(openMenuId === subject.id ? null : subject.id)}
                        className="cursor-pointer rounded-lg border border-zinc-200 px-2 py-1.5 text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-700 disabled:opacity-50"
                      >
                        <svg width={14} height={14} viewBox="0 0 16 16" fill="currentColor">
                          <circle cx={8} cy={2} r={1.5} /><circle cx={8} cy={8} r={1.5} /><circle cx={8} cy={14} r={1.5} />
                        </svg>
                      </button>
                      {openMenuId === subject.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                          <div className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
                            <button
                              type="button"
                              onClick={() => { void openPlanModal(subject); setOpenMenuId(null) }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                            >
                              <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <rect x={2} y={1} width={12} height={14} rx={1} />
                                <path d="M5 5h6M5 8h6M5 11h4" />
                              </svg>
                              Plano de Ensino
                            </button>
                            <div className="my-1 border-t border-zinc-100" />
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => { moveSubject(semesterSubjects, index, -1); setOpenMenuId(null) }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-default"
                            >
                              <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M8 12V4M4 7l4-4 4 4" /></svg>
                              Mover para cima
                            </button>
                            <button
                              type="button"
                              disabled={index === semesterSubjects.length - 1}
                              onClick={() => { moveSubject(semesterSubjects, index, 1); setOpenMenuId(null) }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-default"
                            >
                              <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M8 4v8M4 9l4 4 4-4" /></svg>
                              Mover para baixo
                            </button>
                            <div className="my-1 border-t border-zinc-100" />
                            <button
                              type="button"
                              onClick={() => { removeSubject(subject); setOpenMenuId(null) }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9" /></svg>
                              Remover
                            </button>
                          </div>
                        </>
                      )}
                    </div>
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
