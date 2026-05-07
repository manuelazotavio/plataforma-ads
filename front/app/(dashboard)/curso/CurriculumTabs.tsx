'use client'

import { useState } from 'react'

type Semester = {
  semester: number
  subjects: {
    name: string
    workload_hours: number | null
  }[]
}

export default function CurriculumTabs({ curriculum }: { curriculum: Semester[] }) {
  const firstSemester = curriculum[0]?.semester ?? 1
  const [active, setActive] = useState(firstSemester)
  const current = curriculum.find((s) => s.semester === active) ?? curriculum[0]

  if (!current) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 p-10 text-center">
        <p className="text-sm text-zinc-400">Nenhuma disciplina cadastrada ainda.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="no-scrollbar flex gap-2 mb-6 overflow-x-auto pb-1">
        {curriculum.map((sem) => (
          <button
            key={sem.semester}
            type="button"
            onClick={() => setActive(sem.semester)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors cursor-pointer ${
              active === sem.semester
                ? 'text-white'
                : 'text-zinc-400 hover:text-zinc-700'
            }`}
            style={active === sem.semester ? { backgroundColor: '#2F9E41' } : undefined}
          >
            {sem.semester}º Semestre
          </button>
        ))}
      </div>

      <div className="divide-y divide-zinc-100">
        {current.subjects.map((subject) => (
          <div key={subject.name} className="flex items-center justify-between gap-4 py-3.5">
            <p className="text-base text-zinc-800">{subject.name}</p>
            {subject.workload_hours && (
              <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500">
                {subject.workload_hours}h
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
