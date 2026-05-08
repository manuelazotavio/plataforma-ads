export const dynamic = 'force-dynamic'

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

export default async function CursoPage() {
  const [{ data: professors }, { data: subjects, error: subjectsError }] = await Promise.all([
    supabase
      .from('professors')
      .select('id, name, avatar_url, bio, cargo, years_at_if, email, whatsapp, linkedin, cnpq')
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
    supabase
      .from(CURRICULUM_SUBJECTS_TABLE)
      .select('id, semester, name, workload_hours, display_order, is_active')
      .eq('is_active', true)
      .order('semester', { ascending: true })
      .order('display_order', { ascending: true })
      .order('name', { ascending: true }),
  ])

  const curriculum = !subjectsError && subjects?.length
    ? groupCurriculumSubjects(subjects as CurriculumSubject[])
    : DEFAULT_CURRICULUM

  return (
    <div className="px-4 md:px-10 py-8 flex flex-col gap-12 max-w-5xl mx-auto w-full bg-white">

     
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
                <p className="text-xs text-zinc-400 font-medium uppercase tracking-wide mb-1">{item.label}</p>
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-bold text-zinc-900 mb-4">{children}</h2>
  )
}

const infrastructure = [
  {
    icon: '🖥️',
    bg: '#f0fdf4',
    title: 'Laboratórios de Informática',
    description: 'Laboratórios equipados com computadores modernos e acesso a softwares e ferramentas de desenvolvimento profissional.',
    tags: ['Hardware atualizado', 'IDEs instaladas', 'Acesso remoto', 'Suporte técnico'],
  },
  {
    icon: '📶',
    bg: '#eff6ff',
    title: 'Rede e Conectividade',
    description: 'Wi-Fi de alta velocidade em todo o campus, servidores dedicados para projetos e ambientes de desenvolvimento em nuvem.',
    tags: ['Wi-Fi 6', 'Servidores Linux', 'VPN acadêmica', 'Alta disponibilidade'],
  },
  {
    icon: '📚',
    bg: '#fefce8',
    title: 'Biblioteca e Acervo Digital',
    description: 'Acervo de livros técnicos, assinatura de plataformas de ensino online e acesso a periódicos e artigos científicos.',
    tags: ['Livros técnicos', 'Udemy for Business', 'IEEE Access', 'E-books'],
  },
  {
    icon: '🏗️',
    bg: '#fdf4ff',
    title: 'Espaço Maker',
    description: 'Laboratório de prototipagem com impressoras 3D, Arduino, Raspberry Pi e equipamentos de IoT para projetos práticos.',
    tags: ['Impressão 3D', 'Arduino & RPi', 'IoT', 'Prototipagem rápida'],
  },
]
