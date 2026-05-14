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
import { CLASS_SCHEDULE_PDF_KEY, COURSE_SETTINGS_TABLE, PEDAGOGICAL_PROJECT_PDF_KEY } from '@/app/lib/courseSettings'

export default async function CursoPage() {
  const [{ data: professors }, { data: subjects, error: subjectsError }, { data: courseSettings }] = await Promise.all([
    supabase
      .from('professors')
      .select('id, user_id, name, avatar_url, bio, cargo, years_at_if, email, whatsapp, linkedin, cnpq')
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
    supabase
      .from(CURRICULUM_SUBJECTS_TABLE)
      .select('id, semester, name, workload_hours, display_order, is_active')
      .eq('is_active', true)
      .order('semester', { ascending: true })
      .order('display_order', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from(COURSE_SETTINGS_TABLE)
      .select('key, value')
      .in('key', [CLASS_SCHEDULE_PDF_KEY, PEDAGOGICAL_PROJECT_PDF_KEY]),
  ])

  const curriculum = !subjectsError && subjects?.length
    ? groupCurriculumSubjects(subjects as CurriculumSubject[])
    : DEFAULT_CURRICULUM
  const classSchedulePdfUrl = courseSettings?.find((setting) => setting.key === CLASS_SCHEDULE_PDF_KEY)?.value ?? null
  const pedagogicalProjectPdfUrl = courseSettings?.find((setting) => setting.key === PEDAGOGICAL_PROJECT_PDF_KEY)?.value ?? null

  return (
    <div className="px-4 md:px-6 py-8 flex flex-col gap-12 w-full bg-white">
      <section id="sobre-o-curso" className="scroll-mt-24">
        <SectionTitle>Sobre o curso</SectionTitle>
        <div className="rounded-2xl bg-white p-4 md:p-8 flex flex-col gap-6">
          <p className="text-base text-zinc-600 leading-relaxed">
            O curso Tecnológico em <strong className="text-zinc-900">Análise e Desenvolvimento de Sistemas (ADS)</strong> forma
            profissionais capazes de desenvolver, implantar e manter sistemas computacionais. Com foco em soluções práticas e
            inovadoras, o curso prepara os alunos para o mercado de trabalho em todas as etapas do ciclo de desenvolvimento de software.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Duração', value: '3 anos (6 semestres)' },
              { label: 'Modalidade', value: 'Presencial' },
              { label: 'Turno', value: 'Noturno' },
              { label: 'Grau', value: 'Tecnólogo' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-zinc-50 border border-zinc-100 p-4">
                <p className="text-xs text-zinc-400 font-medium mb-1">{item.label}</p>
                <p className="text-sm font-semibold text-zinc-900">{item.value}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="text-sm font-semibold text-zinc-900 mb-3">O que você vai aprender</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                'Desenvolvimento web e mobile',
                'Banco de dados e modelagem de dados',
                'Engenharia e qualidade de software',
                'Redes e infraestrutura de TI',
                'Inteligência artificial e ciência de dados',
                'Empreendedorismo e gestão de projetos',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-zinc-600">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#2F9E41' }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            {classSchedulePdfUrl && (
              <CourseDocumentLink
                title="Horário de aulas"
                description="Consulte o documento oficial com os horários das turmas."
                href={classSchedulePdfUrl}
              />
            )}

            {pedagogicalProjectPdfUrl && (
              <CourseDocumentLink
                title="Projeto Pedagógico de Curso"
                description="Consulte o documento oficial com a estrutura, objetivos e organização do curso."
                href={pedagogicalProjectPdfUrl}
              />
            )}
          </div>

          <ContactInfoCard />
        </div>
      </section>

      <section id="matriz-curricular" className="scroll-mt-24">
        <SectionTitle>Matriz curricular</SectionTitle>
        <CurriculumTabs curriculum={curriculum} />
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
