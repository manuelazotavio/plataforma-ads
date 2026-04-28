import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'

export default async function CursoPage() {
  const { data: professors } = await supabase
    .from('professors')
    .select('id, name, avatar_url, bio, cargo, years_at_if, email, whatsapp')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  return (
    <div className="px-10 py-8 flex flex-col gap-12 max-w-5xl">

     
      <section>
        <SectionTitle>Sobre o curso</SectionTitle>
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 flex flex-col gap-6">
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
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#0B7A3B' }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

    
      <section>
        <SectionTitle>Matriz curricular</SectionTitle>
        <div className="flex flex-col gap-4">
          {curriculum.map((sem) => (
            <div key={sem.semester} className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
              <div className="px-6 py-3 border-b border-zinc-100 flex items-center gap-3" style={{ backgroundColor: '#f0fdf4' }}>
                <span className="text-sm font-bold" style={{ color: '#0B7A3B' }}>{sem.semester}º Semestre</span>
              </div>
              <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-2">
                {sem.subjects.map((s) => (
                  <p key={s} className="text-sm text-zinc-600 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-zinc-300 shrink-0" />
                    {s}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

     
      <section>
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-zinc-900 mb-3">Conheça os professores</h2>
          <p className="text-sm text-zinc-500 max-w-md mx-auto leading-relaxed">
            Profissionais experientes e dedicados, comprometidos com a formação de qualidade dos alunos do curso de ADS.
          </p>
        </div>

        {!professors || professors.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 p-10 text-center">
            <p className="text-sm text-zinc-400">Nenhum professor cadastrado ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {professors.map((prof) => (
              <div key={prof.id} className="group rounded-2xl overflow-hidden border border-zinc-200 flex flex-col hover:shadow-md transition-shadow cursor-pointer">

                {/* Foto */}
                <div className="relative h-52 bg-zinc-100 shrink-0">
                  {prof.avatar_url ? (
                    <Image src={prof.avatar_url} alt={prof.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl text-zinc-300 font-bold">
                      {prof.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

               
                <div className="px-4 py-4 flex flex-col gap-1 bg-white group-hover:bg-[#0B7A3B] transition-colors duration-200">
                  <p className="text-sm font-bold truncate text-zinc-900 group-hover:text-white transition-colors">
                    {prof.name}
                  </p>
                  {prof.cargo && (
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#0B7A3B] group-hover:text-green-200 transition-colors">
                      {prof.cargo}
                    </p>
                  )}

                  
                  <div className="flex gap-3 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-0 group-hover:h-auto overflow-hidden">
                    {prof.email && (
                      <a
                        href={`mailto:${prof.email}`}
                        className="text-green-200 hover:text-white transition text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        ✉ Email
                      </a>
                    )}
                    {prof.whatsapp && (
                      <a
                        href={`https://wa.me/${prof.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-200 hover:text-white transition text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        WhatsApp ↗
                      </a>
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </section>

     
      <section>
        <SectionTitle>Infraestrutura</SectionTitle>
        <div className="flex flex-col gap-4">
          {infrastructure.map((item, i) => (
            <div key={item.title} className="rounded-2xl border border-zinc-200 bg-white px-8 py-7 grid grid-cols-[auto_1fr_200px_1fr] gap-8 items-center">

              
              <span className="w-11 h-11 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-bold text-zinc-400 shrink-0">
                {String(i + 1).padStart(2, '0')}
              </span>

              
              <div className="flex flex-col gap-2">
                <p className="text-xl font-bold text-zinc-900">{item.title}</p>
                <p className="text-sm text-zinc-500 leading-relaxed">{item.description}</p>
              </div>

             
              <div className="w-full h-28 rounded-xl overflow-hidden flex items-center justify-center text-5xl shrink-0" style={{ backgroundColor: item.bg }}>
                {item.icon}
              </div>

            
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-zinc-700 mb-1">Destaques</p>
                <div className="flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 bg-white">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

            </div>
          ))}
        </div>
      </section>

    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-bold text-zinc-900 mb-4">{children}</h2>
  )
}

const curriculum = [
  {
    semester: 1,
    subjects: ['Lógica de Programação', 'Algoritmos e Estruturas de Dados', 'Matemática Discreta', 'Inglês Técnico', 'Comunicação e Expressão', 'Fundamentos de TI'],
  },
  {
    semester: 2,
    subjects: ['Programação Orientada a Objetos', 'Banco de Dados I', 'Redes de Computadores', 'Sistemas Operacionais', 'Engenharia de Software I'],
  },
  {
    semester: 3,
    subjects: ['Desenvolvimento Web Front-end', 'Banco de Dados II', 'Padrões de Projeto', 'Segurança da Informação', 'Engenharia de Software II'],
  },
  {
    semester: 4,
    subjects: ['Desenvolvimento Web Back-end', 'Desenvolvimento Mobile', 'Cloud Computing', 'Inteligência Artificial', 'Gestão de Projetos'],
  },
  {
    semester: 5,
    subjects: ['DevOps e CI/CD', 'Ciência de Dados', 'Empreendedorismo em TI', 'Projeto Integrador I', 'Estágio Supervisionado I'],
  },
  {
    semester: 6,
    subjects: ['Tópicos Avançados em TI', 'Projeto Integrador II', 'Estágio Supervisionado II', 'Trabalho de Conclusão de Curso'],
  },
]

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
