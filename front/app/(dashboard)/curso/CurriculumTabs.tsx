'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatWorkloadHours } from '@/app/lib/curriculum'
import Select from '@/app/components/Select'

type Subject = {
  id?: string
  name: string
  abbreviation?: string | null
  workload_hours: number | null
}

type Semester = {
  semester: number
  subjects: Subject[]
}

type VersionGroup = {
  id: string | null
  name: string
  year: number | null
  is_current: boolean
  semesters: Semester[]
}

type Equivalency = {
  id: string
  note: string | null
  from: {
    subjectId: string
    name: string
    semester: number
    versionId: string | null
    versionName: string
  }
  members: {
    id: string
    subjectId: string
    name: string
    semester: number
    versionId: string | null
    versionName: string
  }[]
}

type Props =
  | ({ curriculum: Semester[]; versions?: never } & { equivalencies?: Equivalency[] })
  | ({ versions: VersionGroup[]; curriculum?: never } & { equivalencies?: Equivalency[] })

function SemesterView({ curriculum }: { curriculum: Semester[] }) {
  const firstSemester = curriculum[0]?.semester ?? 1
  const [active, setActive] = useState(firstSemester)
  const current = curriculum.find((s) => s.semester === active) ?? curriculum[0]

  if (!current) return null

  return (
    <div>
      <div className="no-scrollbar flex gap-2 mb-6 overflow-x-auto pb-1">
        {curriculum.map((sem) => (
          <button
            key={sem.semester}
            type="button"
            onClick={() => setActive(sem.semester)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors cursor-pointer ${
              active === sem.semester ? 'text-white' : 'text-zinc-400 hover:text-zinc-700'
            }`}
            style={active === sem.semester ? { backgroundColor: '#2F9E41' } : undefined}
          >
            {sem.semester}º Semestre
          </button>
        ))}
      </div>
      <div className="curriculum-subject-list divide-y divide-zinc-100">
        {current.subjects.map((subject) => {
          const inner = (
            <>
              <div className="min-w-0">
                <p className="text-base text-zinc-800">
                  {subject.name}
                  {subject.abbreviation && (
                    <span className="ml-1.5 text-sm text-zinc-400">({subject.abbreviation})</span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {subject.workload_hours && (
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500">
                    {formatWorkloadHours(subject.workload_hours)}h
                  </span>
                )}
                {subject.id && (
                  <svg className="text-zinc-300" width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 3l5 5-5 5" />
                  </svg>
                )}
              </div>
            </>
          )

          if (subject.id) {
            return (
              <Link
                key={subject.id}
                href={`/curso/disciplina/${subject.id}`}
                className="flex items-center justify-between gap-4 py-3.5 cursor-pointer rounded-lg px-2 -mx-2 transition-colors hover:bg-zinc-50"
              >
                {inner}
              </Link>
            )
          }

          return (
            <div
              key={subject.name}
              className="flex items-center justify-between gap-4 py-3.5"
            >
              {inner}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function CurriculumTabs({ curriculum, versions, equivalencies = [] }: Props) {
  const defaultVersion = versions?.find((v) => v.is_current) ?? versions?.[0] ?? null
  const [activeVersionId, setActiveVersionId] = useState<string | null>(defaultVersion?.id ?? null)
  const [equivalenciesOpen, setEquivalenciesOpen] = useState(false)

  if (!versions) {
    if (!curriculum?.length) {
      return (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-10 text-center">
          <p className="text-sm text-zinc-400">Nenhuma disciplina cadastrada ainda.</p>
        </div>
      )
    }
    return (
      <div>
        <EquivalencyButton equivalencies={equivalencies} onClick={() => setEquivalenciesOpen(true)} />
        <SemesterView curriculum={curriculum} />
        {equivalenciesOpen && <EquivalencyModal equivalencies={equivalencies} onClose={() => setEquivalenciesOpen(false)} />}
      </div>
    )
  }

  if (versions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 p-10 text-center">
        <p className="text-sm text-zinc-400">Nenhuma disciplina cadastrada ainda.</p>
      </div>
    )
  }

  const activeVersion = versions.find((v) => v.id === activeVersionId) ?? versions[0]

  return (
    <div>
      <EquivalencyButton equivalencies={equivalencies} onClick={() => setEquivalenciesOpen(true)} />
      {versions.length > 1 && (
        <div className="no-scrollbar flex gap-2 mb-6 overflow-x-auto pb-1">
          {versions.map((v) => (
            <button
              key={v.id ?? 'unversioned'}
              type="button"
              onClick={() => setActiveVersionId(v.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors cursor-pointer ${
                activeVersion.id === v.id ? 'text-white' : 'text-zinc-400 hover:text-zinc-700'
              }`}
              style={activeVersion.id === v.id ? { backgroundColor: '#2F9E41' } : undefined}
            >
              {v.year ?? v.name}
              {v.is_current && (
                <span className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${
                  activeVersion.id === v.id ? 'bg-white/20 text-white' : 'bg-[#2F9E41]/10 text-[#2F9E41]'
                }`}>
                  Atual
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      <SemesterView curriculum={activeVersion.semesters} />
      {equivalenciesOpen && <EquivalencyModal equivalencies={equivalencies} versions={versions} onClose={() => setEquivalenciesOpen(false)} />}
    </div>
  )
}

function EquivalencyButton({ equivalencies, onClick }: { equivalencies: Equivalency[]; onClick: () => void }) {
  if (equivalencies.length === 0) return null

  return (
    <div className="mb-4 flex justify-end">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center justify-center rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
      >
        Comparar equivalências
      </button>
    </div>
  )
}

function EquivalencyModal({ equivalencies, versions, onClose }: { equivalencies: Equivalency[]; versions?: VersionGroup[]; onClose: () => void }) {
  const pairs = buildEquivalencyPairs(equivalencies)
  const matrixNames = Array.from(new Set(pairs.flatMap((pair) => [pair.from.versionName, pair.to.versionName]))).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const matrixOptions = matrixNames.map((name) => ({ value: name, label: name }))
  const [baseMatrix, setBaseMatrix] = useState(matrixNames[0] ?? '')
  const targetOptions = matrixNames.filter((name) => name !== baseMatrix)
  const targetSelectOptions = targetOptions.map((name) => ({ value: name, label: name }))
  const [targetMatrix, setTargetMatrix] = useState(targetOptions[0] ?? '')
  const effectiveTargetMatrix = targetOptions.includes(targetMatrix) ? targetMatrix : targetOptions[0] ?? ''
  const availableSemesters = Array.from(new Set(
    pairs
      .filter((pair) => pair.from.versionName === baseMatrix && pair.to.versionName === effectiveTargetMatrix)
      .map((pair) => pair.from.semester)
  )).sort((a, b) => a - b)
  const [activeSemester, setActiveSemester] = useState<number | null>(availableSemesters[0] ?? null)
  const effectiveSemester = activeSemester && availableSemesters.includes(activeSemester) ? activeSemester : availableSemesters[0] ?? null

  const rows = groupPairsBySubject(
    pairs.filter((pair) => (
      pair.from.versionName === baseMatrix &&
      pair.to.versionName === effectiveTargetMatrix &&
      pair.from.semester === effectiveSemester
    ))
  )

  const subjectIdsWithEquivalency = new Set(rows.map((r) => r.subjectId))
  const baseVersionGroup = versions?.find((v) => v.name === baseMatrix)
  const allBaseSubjects = effectiveSemester != null
    ? (baseVersionGroup?.semesters.find((s) => s.semester === effectiveSemester)?.subjects ?? [])
    : []
  const rowsWithoutEquivalency = allBaseSubjects
    .filter((s) => s.id && !subjectIdsWithEquivalency.has(s.id))
    .map((s) => ({
      subjectId: s.id!,
      name: s.name,
      semester: effectiveSemester!,
      equivalents: [] as { subjectId: string; name: string; semester: number; note: string | null }[],
    }))
  const allRows = [...rows, ...rowsWithoutEquivalency].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 rounded-t-2xl border-b border-zinc-100 bg-white px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Comparar equivalências</h2>
            <p className="mt-1 text-sm text-zinc-500">Escolha duas matrizes e um semestre para ver a equivalência lado a lado.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-700"
            aria-label="Fechar"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-500">
              Matriz base
              <Select
                value={baseMatrix}
                onChange={(value) => {
                  setBaseMatrix(value)
                  setActiveSemester(null)
                }}
                options={matrixOptions}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-500">
              Comparar com
              <Select
                value={effectiveTargetMatrix}
                onChange={(value) => {
                  setTargetMatrix(value)
                  setActiveSemester(null)
                }}
                options={targetSelectOptions}
                disabled={targetSelectOptions.length === 0}
              />
            </label>

            <button
              type="button"
              onClick={() => {
                setBaseMatrix(effectiveTargetMatrix)
                setTargetMatrix(baseMatrix)
                setActiveSemester(null)
              }}
              disabled={!effectiveTargetMatrix}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-40"
            >
              Inverter
            </button>
          </div>

          {availableSemesters.length > 0 ? (
            <>
              <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1">
                {availableSemesters.map((semester) => (
                  <button
                    key={semester}
                    type="button"
                    onClick={() => setActiveSemester(semester)}
                    className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                      effectiveSemester === semester ? 'text-white' : 'text-zinc-400 hover:text-zinc-700'
                    }`}
                    style={effectiveSemester === semester ? { backgroundColor: '#2F9E41' } : undefined}
                  >
                    {semester}º semestre
                  </button>
                ))}
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border border-zinc-200">
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] bg-zinc-50 text-xs font-semibold text-zinc-500">
                  <div className="border-r border-zinc-200 px-4 py-3">{baseMatrix}</div>
                  <div className="px-4 py-3">{effectiveTargetMatrix}</div>
                </div>

                <div className="divide-y divide-zinc-100">
                  {allRows.map((row) => (
                    <div key={row.subjectId} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                      <div className="border-r border-zinc-100 px-4 py-4">
                        <p className="text-sm font-semibold text-zinc-900">{row.name}</p>
                        <p className="mt-1 text-xs text-zinc-400">{row.semester}º semestre</p>
                      </div>
                      <div className="px-4 py-4">
                        {row.equivalents.length === 0 ? (
                          <p className="text-sm text-zinc-400 italic">Não há matéria equivalente</p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {row.equivalents.map((equivalent) => (
                              <div key={equivalent.subjectId} className="rounded-lg bg-green-50 px-3 py-2">
                                <p className="text-sm font-semibold text-[#2F9E41]">{equivalent.name}</p>
                                <p className="mt-0.5 text-xs text-green-700/70">{equivalent.semester}º semestre</p>
                                {equivalent.note && <p className="mt-1 text-xs text-green-700/70">{equivalent.note}</p>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-zinc-200 px-4 py-10 text-center">
              <p className="text-sm font-medium text-zinc-900">Sem equivalências cadastradas entre essas matrizes.</p>
              <p className="mt-1 text-sm text-zinc-400">Tente inverter as matrizes ou selecionar outra combinação.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

type EquivalencyPair = {
  id: string
  note: string | null
  from: {
    subjectId: string
    name: string
    semester: number
    versionName: string
  }
  to: {
    subjectId: string
    name: string
    semester: number
    versionName: string
  }
}

function buildEquivalencyPairs(equivalencies: Equivalency[]) {
  return equivalencies.flatMap((equivalency) => equivalency.members.flatMap((member) => {
    const forward = {
      id: `${equivalency.id}-${member.id}-forward`,
      note: equivalency.note,
      from: {
        subjectId: equivalency.from.subjectId,
        name: equivalency.from.name,
        semester: equivalency.from.semester,
        versionName: equivalency.from.versionName,
      },
      to: {
        subjectId: member.subjectId,
        name: member.name,
        semester: member.semester,
        versionName: member.versionName,
      },
    }
    const reverse = {
      id: `${equivalency.id}-${member.id}-reverse`,
      note: equivalency.note,
      from: forward.to,
      to: forward.from,
    }
    return [forward, reverse]
  }))
}

function groupPairsBySubject(pairs: EquivalencyPair[]) {
  const rowMap = new Map<string, {
    subjectId: string
    name: string
    semester: number
    equivalents: {
      subjectId: string
      name: string
      semester: number
      note: string | null
    }[]
  }>()

  for (const pair of pairs) {
    if (!rowMap.has(pair.from.subjectId)) {
      rowMap.set(pair.from.subjectId, {
        subjectId: pair.from.subjectId,
        name: pair.from.name,
        semester: pair.from.semester,
        equivalents: [],
      })
    }
    const row = rowMap.get(pair.from.subjectId)!
    if (!row.equivalents.some((item) => item.subjectId === pair.to.subjectId)) {
      row.equivalents.push({
        subjectId: pair.to.subjectId,
        name: pair.to.name,
        semester: pair.to.semester,
        note: pair.note,
      })
    }
  }

  return Array.from(rowMap.values())
    .map((row) => ({
      ...row,
      equivalents: row.equivalents.sort((a, b) => a.semester - b.semester || a.name.localeCompare(b.name, 'pt-BR')),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}
