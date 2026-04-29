'use client'

import { useState } from 'react'

type Semester = {
  semester: number
  subjects: string[]
}

export default function CurriculumTabs({ curriculum }: { curriculum: Semester[] }) {
  const [active, setActive] = useState(1)
  const current = curriculum.find((s) => s.semester === active)!

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {curriculum.map((sem) => (
          <button
            key={sem.semester}
            onClick={() => setActive(sem.semester)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors cursor-pointer ${
              active === sem.semester
                ? 'text-white'
                : 'text-zinc-400 hover:text-zinc-700'
            }`}
            style={active === sem.semester ? { backgroundColor: '#0B7A3B' } : undefined}
          >
            {sem.semester}º Semestre
          </button>
        ))}
      </div>

      <div className="divide-y divide-zinc-100">
        {current.subjects.map((s) => (
          <p key={s} className="py-3.5 text-base text-zinc-800">{s}</p>
        ))}
      </div>
    </div>
  )
}
