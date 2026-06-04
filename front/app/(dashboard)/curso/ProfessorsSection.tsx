'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

type Professor = {
  id: string
  user_id: string | null
  name: string
  avatar_url: string | null
  bio: string | null
  cargo: string | null
  years_at_if: number | null
  email: string | null
  whatsapp: string | null
  linkedin: string | null
  cnpq: string | null
}

type Discipline = {
  subject_name: string
  subject_semester: number | null
  subject_abbreviation: string | null
  period: string | null
  version_year: number | null
}

type SocialLink = { href: string; label: string }

const AREAS = [
  { value: 'front-end', label: 'Front-end' },
  { value: 'back-end', label: 'Back-end' },
  { value: 'full-stack', label: 'Full-stack' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'dados', label: 'Dados & IA' },
  { value: 'devops', label: 'DevOps & Cloud' },
  { value: 'ux-design', label: 'UX & Design' },
  { value: 'seguranca', label: 'Segurança' },
]

function socialLinks(prof: Professor): SocialLink[] {
  const links: SocialLink[] = []
  const whatsappNumber = prof.whatsapp?.replace(/\D/g, '')
  if (whatsappNumber) links.push({ href: `https://wa.me/${whatsappNumber}`, label: 'WhatsApp' })
  if (prof.linkedin) links.push({ href: prof.linkedin, label: 'LinkedIn' })
  if (prof.cnpq) links.push({ href: prof.cnpq, label: 'Lattes' })
  return links
}

function formatCargo(cargo: string) {
  const normalized = cargo.toLocaleLowerCase('pt-BR')
  return normalized.charAt(0).toLocaleUpperCase('pt-BR') + normalized.slice(1)
}

function formatInterestArea(value: string) {
  const knownArea = AREAS.find((area) => area.value === value)
  if (knownArea) return knownArea.label

  return value
    .split(/([\s/-]+)/)
    .map((part) => (/^[\s/-]+$/.test(part) ? part : part.charAt(0).toLocaleUpperCase('pt-BR') + part.slice(1)))
    .join('')
}

function ProfessorCard({ prof, onOpen }: { prof: Professor; onOpen: (professor: Professor) => void }) {
  const [hovered, setHovered] = useState(false)

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen(prof)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(prof)}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative h-72 w-52 shrink-0 cursor-pointer overflow-hidden rounded-2xl bg-transparent focus:outline-none"
      aria-label={`Ver detalhes de ${prof.name}`}
    >
      {prof.avatar_url ? (
        <Image
          src={prof.avatar_url}
          alt={prof.name}
          fill
          className="object-cover"
          style={{
            transform: hovered ? 'scale(1.06)' : 'scale(1)',
            transition: 'transform 0.6s cubic-bezier(0.76, 0, 0.24, 1)',
          }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-5xl font-black text-zinc-300">
          {prof.name.charAt(0).toUpperCase()}
        </div>
      )}

      <div
        className="absolute inset-x-0 bottom-0 flex flex-col gap-1 px-5 py-5"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)',
          transform: hovered ? 'translateY(0)' : 'translateY(30%)',
          opacity: hovered ? 1 : 0,
          transition: 'transform 0.4s cubic-bezier(0.76, 0, 0.24, 1), opacity 0.4s ease',
        }}
      >
        <p className="text-base font-bold leading-tight text-white">{prof.name}</p>
        {prof.cargo && (
          <p className="text-sm font-semibold tracking-wide" style={{ color: '#4ade80' }}>
            {formatCargo(prof.cargo)}
          </p>
        )}
      </div>

      <div
        className="absolute inset-x-0 bottom-0 px-5 py-4"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
          opacity: hovered ? 0 : 1,
          transition: 'opacity 0.3s ease',
        }}
      >
        <p className="truncate text-sm font-semibold leading-tight text-white">{prof.name}</p>
      </div>
    </div>
  )
}

function ProfessorDetailsModal({
  professor,
  onClose,
}: {
  professor: Professor
  onClose: () => void
}) {
  const router = useRouter()
  const links = socialLinks(professor)
  const profileHref = professor.user_id ? `/usuarios/${professor.user_id}` : null
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [disciplinesLoading, setDisciplinesLoading] = useState(true)
  const [areas, setAreas] = useState<string[]>([])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    let cancelled = false

    queueMicrotask(() => {
      if (cancelled) return
      setDisciplinesLoading(true)
      setDisciplines([])
      setAreas([])
    })

    const fetchDisciplines = supabase
      .from('curriculum_subject_professors')
      .select('period, curriculum_subjects(name, semester, abbreviation, curriculum_versions(year))')
      .eq('professor_id', professor.id)
      .then(({ data }) => {
        if (!data) return []
        const rows: Discipline[] = (data as unknown as {
          period: string | null
          curriculum_subjects: {
            name: string
            semester: number | null
            abbreviation: string | null
            curriculum_versions: { year: number }[] | null
          } | null
        }[]).flatMap((row) => {
          if (!row.curriculum_subjects) return []
          return [{
            subject_name: row.curriculum_subjects.name,
            subject_semester: row.curriculum_subjects.semester,
            subject_abbreviation: row.curriculum_subjects.abbreviation,
            period: row.period,
            version_year: row.curriculum_subjects.curriculum_versions?.[0]?.year ?? null,
          }]
        })
        rows.sort((a, b) => (b.version_year ?? 0) - (a.version_year ?? 0) || (a.subject_semester ?? 0) - (b.subject_semester ?? 0))
        return rows
      })

    const fetchAreas = professor.user_id
      ? supabase
          .from('users')
          .select('preferred_area')
          .eq('id', professor.user_id)
          .maybeSingle()
          .then(({ data }) => {
            const raw = (data as { preferred_area: string | null } | null)?.preferred_area
            return raw?.split(',').map((s) => s.trim()).filter(Boolean) ?? []
          })
      : Promise.resolve([])

    void Promise.all([fetchDisciplines, fetchAreas]).then(([nextDisciplines, nextAreas]) => {
      if (cancelled) return
      setDisciplines(nextDisciplines)
      setAreas(nextAreas)
      setDisciplinesLoading(false)
    })

    return () => { cancelled = true }
  }, [professor.id, professor.user_id])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes de ${professor.name}`}
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200"
          aria-label="Fechar detalhes"
        >
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
          </svg>
        </button>

        <div className="flex items-start gap-4 pr-8">
          <div className="relative h-36 w-26 shrink-0 overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800">
            {professor.avatar_url ? (
              <Image src={professor.avatar_url} alt={professor.name} fill className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl font-black text-zinc-300 dark:text-zinc-600">
                {professor.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-bold leading-tight text-zinc-900 dark:text-zinc-100">{professor.name}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {professor.cargo && (
                <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  {professor.cargo}
                </span>
              )}
              {professor.years_at_if != null && professor.years_at_if > 0 && (
                <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  {professor.years_at_if} {professor.years_at_if === 1 ? 'ano' : 'anos'} no IF
                </span>
              )}
            </div>

            {areas.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-zinc-400">Áreas de interesse</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {areas.map((area) => (
                    <span
                      key={area}
                      className="rounded-full bg-[#2F9E41]/10 px-2.5 py-1 text-xs font-medium text-[#2F9E41]"
                    >
                      {formatInterestArea(area)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {professor.email && (
              <p className="mt-3 break-all text-sm font-medium text-zinc-700">{professor.email}</p>
            )}
          </div>

        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold text-zinc-400">Descrição</p>
          {professor.bio ? (
            <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{professor.bio}</p>
          ) : (
            <p className="mt-2 text-sm text-zinc-400">Descrição ainda não cadastrada.</p>
          )}
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold text-zinc-400">Disciplinas já ministradas</p>
          {disciplinesLoading ? (
            <p className="mt-2 text-sm text-zinc-400">Buscando disciplinas...</p>
          ) : disciplines.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-400">Nenhuma disciplina vinculada.</p>
          ) : (
            <div className="mt-2 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-800">
              {disciplines.map((d, i) => (
                <div key={i} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">{d.subject_name}</p>
                    {d.subject_semester != null && (
                      <p className="text-xs text-zinc-400">{d.subject_semester}º semestre</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    {d.version_year && (
                      <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                        {d.version_year}
                      </span>
                    )}
                    {d.period && (
                      <span className="text-[11px] text-zinc-400">{d.period}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {links.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold text-zinc-400">Redes sociais</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {links.map((link) => (
                <a
                  key={`modal-${professor.id}-${link.label}`}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition hover:border-[#2F9E41] hover:text-[#2F9E41]"
                >
                  {link.label}
                </a>
            ))}
          </div>
        </div>
        )}

        {profileHref && (
          <button
            type="button"
            onClick={() => router.push(profileHref)}
            className="mt-6 rounded-full bg-[#2F9E41] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#278736]"
          >
            Abrir perfil completo
          </button>
        )}
      </div>
    </div>
  )
}

export default function ProfessorsSection({ professors }: { professors: Professor[] }) {
  const [selectedProfessor, setSelectedProfessor] = useState<Professor | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateButtons = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    updateButtons()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', updateButtons, { passive: true })
    window.addEventListener('resize', updateButtons)
    return () => {
      el.removeEventListener('scroll', updateButtons)
      window.removeEventListener('resize', updateButtons)
    }
  }, [updateButtons, professors.length])

  function scrollBy(direction: -1 | 1) {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: direction * Math.round(el.clientWidth * 0.8), behavior: 'smooth' })
  }

  return (
    <>
      <div className="relative">
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Anterior"
            className="absolute left-1 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 shadow-md transition hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 md:grid"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Próximo"
            className="absolute right-1 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 shadow-md transition hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 md:grid"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        )}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scroll-smooth pb-2 -mx-4 px-4 md:-mx-6 md:px-6"
          style={{ scrollbarWidth: 'none' }}
        >
          {professors.map((prof) => (
            <ProfessorCard key={prof.id} prof={prof} onOpen={setSelectedProfessor} />
          ))}
        </div>
      </div>

      {selectedProfessor && (
        <ProfessorDetailsModal
          professor={selectedProfessor}
          onClose={() => setSelectedProfessor(null)}
        />
      )}
    </>
  )
}
