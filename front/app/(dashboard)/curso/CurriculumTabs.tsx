'use client'

import { useState } from 'react'
import { formatWorkloadHours } from '@/app/lib/curriculum'

type Semester = {
  semester: number
  subjects: {
    name: string
    workload_hours: number | null
  }[]
}

type VersionGroup = {
  id: string | null
  name: string
  year: number | null
  is_current: boolean
  semesters: Semester[]
}

type Props =
  | { curriculum: Semester[]; versions?: never }
  | { versions: VersionGroup[]; curriculum?: never }

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
        {current.subjects.map((subject) => (
          <div key={subject.name} className="flex items-center justify-between gap-4 py-3.5">
            <div className="flex items-center gap-2 min-w-0">
              {subject.abbreviation && (
                <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-mono font-medium text-zinc-500">
                  {subject.abbreviation}
                </span>
              )}
              <p className="text-base text-zinc-800">{subject.name}</p>
            </div>
            {subject.workload_hours && (
              <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500">
                {formatWorkloadHours(subject.workload_hours)}h
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CurriculumTabs({ curriculum, versions }: Props) {
  const defaultVersion = versions?.find((v) => v.is_current) ?? versions?.[0] ?? null
  const [activeVersionId, setActiveVersionId] = useState<string | null>(defaultVersion?.id ?? null)

  if (!versions) {
    if (!curriculum?.length) {
      return (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-10 text-center">
          <p className="text-sm text-zinc-400">Nenhuma disciplina cadastrada ainda.</p>
        </div>
      )
    }
    return <SemesterView curriculum={curriculum} />
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
                  atual
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      <SemesterView curriculum={activeVersion.semesters} />
    </div>
  )
}
