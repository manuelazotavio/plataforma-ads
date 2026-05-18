export const dynamic = 'force-dynamic'

import type { ReactNode } from 'react'
import ContactInfoCard from '@/app/components/ContactInfoCard'
import { supabase } from '@/app/lib/supabase'
import CurriculumTabs from './CurriculumTabs'
import InfrastructureSection from './InfrastructureSection'
import ProfessorsSection from './ProfessorsSection'
import {
  CURRICULUM_SUBJECTS_TABLE,
  DEFAULT_CURRICULUM,
  CurriculumSubject,
  groupCurriculumSubjects,
} from '@/app/lib/curriculum'
import {
  CLASS_SCHEDULE_PDF_KEY,
  COURSE_DESCRIPTION_KEY,
  COURSE_INFO_CARDS_KEY,
  COURSE_LEARNING_ITEMS_KEY,
  COURSE_SETTINGS_TABLE,
  DEFAULT_COURSE_DESCRIPTION,
  DEFAULT_INFO_CARDS,
  DEFAULT_LEARNING_ITEMS,
  InfoCard,
} from '@/app/lib/courseSettings'

export default async function CursoPage() {
  const [{ data: professors }, { data: rawSubjects, error: subjectsError }, { data: courseSettings }, { data: versions }, { data: ppcDocs }] = await Promise.all([
    supabase
      .from('professors')
      .select('id, user_id, name, avatar_url, bio, cargo, years_at_if, email, whatsapp, linkedin, cnpq')
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
    supabase
      .from(CURRICULUM_SUBJECTS_TABLE)
      .select('id, semester, name, abbreviation, workload_hours, display_order, is_active, version_id')
      .eq('is_active', true)
      .order('semester', { ascending: true })
      .order('display_order', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from(COURSE_SETTINGS_TABLE)
      .select('key, value')
      .in('key', [CLASS_SCHEDULE_PDF_KEY, COURSE_DESCRIPTION_KEY, COURSE_INFO_CARDS_KEY, COURSE_LEARNING_ITEMS_KEY]),
    supabase
      .from('curriculum_versions')
      .select('id, name, year, is_current')
      .order('year', { ascending: false }),
    supabase
      .from('course_ppc_documents')
      .select('id, label, url')
      .order('display_order', { ascending: false }),
  ])

  type SubjectWithVersion = CurriculumSubject & { version_id: string | null }
  const subjects = rawSubjects as SubjectWithVersion[] | null
  const allVersions = (versions ?? []) as { id: string; name: string; year: number; is_current: boolean }[]

  const versionedSubjectIds = new Set((subjects ?? []).filter((s) => s.version_id).map((s) => s.id))
  const hasVersionedSubjects = versionedSubjectIds.size > 0

  let curriculum = DEFAULT_CURRICULUM
  let curriculumVersions: { id: string | null; name: string; year: number | null; is_current: boolean; semesters: ReturnType<typeof groupCurriculumSubjects> }[] = []

  if (!subjectsError && subjects?.length) {
    if (hasVersionedSubjects) {
      const unversionedSubjects = subjects.filter((s) => !s.version_id)
      const versionGroups = allVersions
        .map((v) => {
          const vSubjects = subjects.filter((s) => s.version_id === v.id)
          return { id: v.id, name: v.name, year: v.year, is_current: v.is_current, semesters: groupCurriculumSubjects(vSubjects as CurriculumSubject[]) }
        })
        .filter((v) => v.semesters.length > 0)

      if (unversionedSubjects.length > 0) {
        curriculumVersions.push({ id: null, name: 'Histórico', year: null, is_current: false, semesters: groupCurriculumSubjects(unversionedSubjects as CurriculumSubject[]) })
      }
      curriculumVersions.push(...versionGroups)
    } else {
      curriculum = groupCurriculumSubjects(subjects as CurriculumSubject[])
    }
  }
  const settingsMap = Object.fromEntries(((courseSettings ?? []) as { key: string; value: string | null }[]).map((s) => [s.key, s.value]))
  const classSchedulePdfUrl = settingsMap[CLASS_SCHEDULE_PDF_KEY] ?? null
  const courseDescription = settingsMap[COURSE_DESCRIPTION_KEY] ?? DEFAULT_COURSE_DESCRIPTION
  const infoCards: InfoCard[] = settingsMap[COURSE_INFO_CARDS_KEY] ? (() => { try { return JSON.parse(settingsMap[COURSE_INFO_CARDS_KEY]!) } catch { return DEFAULT_INFO_CARDS } })() : DEFAULT_INFO_CARDS
  const learningItems: string[] = settingsMap[COURSE_LEARNING_ITEMS_KEY] ? (() => { try { return JSON.parse(settingsMap[COURSE_LEARNING_ITEMS_KEY]!) } catch { return DEFAULT_LEARNING_ITEMS } })() : DEFAULT_LEARNING_ITEMS
  const ppcs = (ppcDocs ?? []) as { id: string; label: string; url: string }[]

  return (
    <div className="px-4 md:px-6 py-8 flex flex-col gap-12 w-full bg-white">
      <section id="sobre-o-curso" className="scroll-mt-24">
        <SectionTitle>Sobre o curso</SectionTitle>
        <div className="rounded-2xl bg-white p-4 md:p-8 flex flex-col gap-6">
          {courseDescription && (
            <p className="text-base text-zinc-600 leading-relaxed">{courseDescription}</p>
          )}

          {infoCards.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {infoCards.map((item) => (
                <div key={item.label} className="rounded-xl bg-zinc-50 border border-zinc-100 p-4">
                  <p className="text-xs text-zinc-400 font-medium mb-1">{item.label}</p>
                  <p className="text-sm font-semibold text-zinc-900">{item.value}</p>
                </div>
              ))}
            </div>
          )}

          {learningItems.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-zinc-900 mb-3">O que você vai aprender</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {learningItems.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-zinc-600">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#2F9E41' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {classSchedulePdfUrl && (
              <CourseDocumentLink
                title="Horário de aulas"
                description="Consulte o documento oficial com os horários das turmas."
                href={classSchedulePdfUrl}
              />
            )}

            {ppcs.length > 0 && (
              <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                <p className="text-sm font-semibold text-zinc-900 mb-3">Projeto Pedagógico de Curso</p>
                <div className="flex flex-col gap-2">
                  {ppcs.map((ppc) => (
                    <div key={ppc.id} className="flex items-center justify-between gap-4">
                      <p className="text-sm text-zinc-700">{ppc.label}</p>
                      <a
                        href={ppc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-lg bg-[#2F9E41] px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
                      >
                        Abrir PDF
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <ContactInfoCard />
        </div>
      </section>

      <section id="matriz-curricular" className="scroll-mt-24">
        <SectionTitle>Matriz curricular</SectionTitle>
        {curriculumVersions.length > 0
          ? <CurriculumTabs versions={curriculumVersions} />
          : <CurriculumTabs curriculum={curriculum} />
        }
      </section>

      <section id="professores" className="scroll-mt-24">
        <SectionTitle>Professores</SectionTitle>
        {!professors || professors.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 p-10 text-center">
            <p className="text-sm text-zinc-400">Nenhum professor cadastrado ainda.</p>
          </div>
        ) : (
          <ProfessorsSection professors={professors} />
        )}
      </section>

      <section id="infraestrutura" className="scroll-mt-24">
        <SectionTitle>Infraestrutura</SectionTitle>
        <InfrastructureSection infrastructure={infrastructure} />
      </section>
    </div>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xl font-bold text-zinc-900 mb-4">{children}</h2>
  )
}

function CourseDocumentLink({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-900">{title}</p>
          <p className="mt-1 text-sm text-zinc-500">{description}</p>
        </div>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex justify-center rounded-lg bg-[#2F9E41] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Abrir PDF
        </a>
      </div>
    </div>
  )
}

const infrastructure = [
  {
    title: 'Laboratórios de Informática',
    description: 'Laboratórios equipados com computadores modernos e acesso a softwares e ferramentas de desenvolvimento profissional.',
    tags: ['Hardware atualizado', 'IDEs instaladas', 'Acesso remoto', 'Suporte técnico'],
  },
  {
    title: 'Rede e Conectividade',
    description: 'Wi-Fi de alta velocidade em todo o campus, servidores dedicados para projetos e ambientes de desenvolvimento em nuvem.',
    tags: ['Wi-Fi 6', 'Alta disponibilidade'],
  },
  {
    title: 'Biblioteca e Acervo Digital',
    description: 'Acervo de livros técnicos, assinatura de plataformas de ensino online e acesso a periódicos e artigos científicos.',
    tags: ['Livros técnicos', 'IEEE Access', 'E-books'],
  },
  {
    title: 'LabTech',
    description: 'Laboratório de prototipagem com impressoras 3D, Arduino, Raspberry Pi e equipamentos de IoT para projetos práticos.',
    tags: ['Impressão 3D', 'Arduino & RPi', 'IoT', 'Prototipagem rápida'],
  },
]
