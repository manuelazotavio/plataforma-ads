import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { formatWorkloadHours } from '@/app/lib/curriculum'

export const dynamic = 'force-dynamic'

type Subject = {
  id: string
  name: string
  abbreviation: string | null
  semester: number
  workload_hours: number | null
}

type Plan = {
  tipo: string | null
  n_docentes: number | null
  n_aulas_semanais: number | null
  total_aulas: number | null
  ch_ead: number | null
  ch_extensao: number | null
  ch_total: number | null
  abordagem_metodologica: string | null
  usa_laboratorio: boolean | null
  ch_laboratorio: number | null
  laboratorio_descricao: string | null
  nucleo_formacao: string | null
  grupo_conhecimentos: string | null
  ementa: string | null
  objectives: string | null
  content: string | null
  bibliography_basic: string | null
  bibliography_complementary: string | null
}

type ProfessorJoin = { avatar_url: string | null; user_id: string | null } | null
type ProfessorRecord = {
  id: string
  professor_name: string
  period: string | null
  professor_id: string | null
  professors: ProfessorJoin
}

const COURSE_NAME = 'Tecnologia em Análise e Desenvolvimento de Sistemas'

function fmtHoras(value: number | null) {
  if (value == null) return '—'
  return `${formatWorkloadHours(value)} h`
}

function htmlIsEmpty(html: string | null | undefined) {
  if (!html) return true
  return html.replace(/<[^>]*>/g, '').trim().length === 0
}

export default async function SubjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [{ data: subject }, { data: plan }, { data: profs }] = await Promise.all([
    supabase
      .from('curriculum_subjects')
      .select('id, name, abbreviation, semester, workload_hours')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('curriculum_subject_plans')
      .select('tipo, n_docentes, n_aulas_semanais, total_aulas, ch_ead, ch_extensao, ch_total, abordagem_metodologica, usa_laboratorio, ch_laboratorio, laboratorio_descricao, nucleo_formacao, grupo_conhecimentos, ementa, objectives, content, bibliography_basic, bibliography_complementary')
      .eq('subject_id', id)
      .maybeSingle(),
    supabase
      .from('curriculum_subject_professors')
      .select('id, professor_name, period, professor_id, professors(avatar_url, user_id)')
      .eq('subject_id', id)
      .order('display_order', { ascending: true }),
  ])

  if (!subject) notFound()

  const sub = subject as Subject
  const p = (plan ?? null) as Plan | null
  const professors = ((profs ?? []) as unknown as ProfessorRecord[])

  const richBlocks = [
    { label: '3. Ementa', value: p?.ementa },
    { label: '4. Objetivos', value: p?.objectives },
    { label: '5. Conteúdo Programático', value: p?.content },
    { label: '6. Bibliografia Básica', value: p?.bibliography_basic },
    { label: '7. Bibliografia Complementar', value: p?.bibliography_complementary },
  ].filter((b) => !htmlIsEmpty(b.value))

  const abordagem = p?.abordagem_metodologica ?? ''

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8 md:px-10 lg:px-12 bg-white">
      <Link
        href="/curso#matriz-curricular"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-zinc-700"
      >
        <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13L5 8l5-5" />
        </svg>
        Voltar para a matriz
      </Link>

      <h1 className="mb-8 text-2xl font-bold text-zinc-900">
        {sub.name}
        {sub.abbreviation && (
          <span className="ml-2 font-normal text-zinc-400">({sub.abbreviation})</span>
        )}
      </h1>

      <section className="mb-8">
        <h2 className="mb-3 text-base font-semibold text-zinc-900">1. Identificação</h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-300">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <tbody>
              <tr>
                <td colSpan={6} className="border-b border-zinc-300 px-3 py-2">
                  <span className="font-semibold text-zinc-800">CURSO: </span>
                  <span className="text-zinc-700">{COURSE_NAME}</span>
                </td>
              </tr>
              <tr>
                <td colSpan={6} className="border-b border-zinc-300 px-3 py-2">
                  <span className="font-semibold text-zinc-800">Componente Curricular: </span>
                  <span className="uppercase text-zinc-700">{sub.name}</span>
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="border-b border-r border-zinc-300 px-3 py-2">
                  <span className="font-semibold text-zinc-800">Semestre: </span>
                  <span className="text-zinc-700">{sub.semester}º</span>
                </td>
                <td colSpan={2} className="border-b border-r border-zinc-300 px-3 py-2">
                  <span className="font-semibold text-zinc-800">Código: </span>
                  <span className="text-zinc-700">{sub.abbreviation ?? '—'}</span>
                </td>
                <td colSpan={2} className="border-b border-zinc-300 px-3 py-2">
                  <span className="font-semibold text-zinc-800">Tipo: </span>
                  <span className="text-zinc-700">{p?.tipo ?? '—'}</span>
                </td>
              </tr>
              <tr>
                <td className="border-b border-r border-zinc-300 px-3 py-2 align-top">
                  <p className="text-xs font-semibold text-zinc-800">Nº de docentes:</p>
                  <p className="text-zinc-700">{p?.n_docentes ?? '—'}</p>
                </td>
                <td className="border-b border-r border-zinc-300 px-3 py-2 align-top">
                  <p className="text-xs font-semibold text-zinc-800">Nº aulas semanais:</p>
                  <p className="text-zinc-700">{p?.n_aulas_semanais ?? '—'}</p>
                </td>
                <td className="border-b border-r border-zinc-300 px-3 py-2 align-top">
                  <p className="text-xs font-semibold text-zinc-800">Total de aulas:</p>
                  <p className="text-zinc-700">{p?.total_aulas ?? '—'}</p>
                </td>
                <td colSpan={3} className="border-b border-zinc-300 px-3 py-2 align-top">
                  <div className="flex flex-col gap-0.5 text-zinc-700">
                    <p><span className="font-semibold text-zinc-800">C.H. Ensino:</span> {fmtHoras(sub.workload_hours)}</p>
                    <p><span className="font-semibold text-zinc-800">C.H. EaD:</span> {fmtHoras(p?.ch_ead ?? null)}</p>
                    <p><span className="font-semibold text-zinc-800">C.H. Extensão:</span> {fmtHoras(p?.ch_extensao ?? null)}</p>
                    <p><span className="font-semibold text-zinc-800">Total de horas:</span> {fmtHoras(p?.ch_total ?? null)}</p>
                  </div>
                </td>
              </tr>
              <tr>
                <td colSpan={3} className="border-r border-zinc-300 px-3 py-2 align-top">
                  <p className="mb-2 text-xs font-semibold text-zinc-800">Abordagem Metodológica:</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-zinc-700">
                    <Marker label="Teórica" active={abordagem === 'T'} />
                    <Marker label="Prática" active={abordagem === 'P'} />
                    <Marker label="Teórico-Prática" active={abordagem === 'T-P'} />
                  </div>
                </td>
                <td colSpan={3} className="px-3 py-2 align-top">
                  <p className="mb-2 text-xs font-semibold text-zinc-800">Uso de laboratório ou outros ambientes além da sala de aula?</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-zinc-700">
                    <Marker label="Sim" active={p?.usa_laboratorio === true} />
                    <Marker label="Não" active={p?.usa_laboratorio === false || p?.usa_laboratorio == null} />
                    {p?.usa_laboratorio && p?.ch_laboratorio != null && (
                      <span><span className="font-semibold text-zinc-800">C.H.:</span> {fmtHoras(p.ch_laboratorio)}</span>
                    )}
                  </div>
                  {p?.usa_laboratorio && p?.laboratorio_descricao && (
                    <p className="mt-1 text-zinc-700">
                      <span className="font-semibold text-zinc-800">Qual(is):</span> {p.laboratorio_descricao}
                    </p>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {(p?.nucleo_formacao || p?.grupo_conhecimentos) && (
        <section className="mb-8">
          <h2 className="mb-3 text-base font-semibold text-zinc-900">
            2. Grupos de Conhecimentos Essenciais do Currículo de Referência
          </h2>
          <div className="overflow-x-auto rounded-lg border border-zinc-300">
            <table className="w-full border-collapse text-sm">
              <tbody>
                {p?.nucleo_formacao && (
                  <tr>
                    <td className="border-b border-zinc-300 px-3 py-2">
                      <span className="font-semibold text-zinc-800">Núcleo de Formação: </span>
                      <span className="text-zinc-700">{p.nucleo_formacao}</span>
                    </td>
                  </tr>
                )}
                {p?.grupo_conhecimentos && (
                  <tr>
                    <td className="px-3 py-2">
                      <span className="font-semibold text-zinc-800">Grupo de Conhecimentos: </span>
                      <span className="text-zinc-700">{p.grupo_conhecimentos}</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {richBlocks.length === 0 && !p?.nucleo_formacao && !p?.grupo_conhecimentos && !p?.tipo && (
        <div className="mb-8 rounded-lg border border-dashed border-zinc-200 p-6 text-center">
          <p className="text-sm text-zinc-400">Plano de ensino ainda não cadastrado.</p>
        </div>
      )}

      {richBlocks.map((b) => (
        <section key={b.label} className="mb-8">
          <h2 className="mb-3 text-base font-semibold text-zinc-900">{b.label}</h2>
          <div
            className="prose max-w-none text-zinc-700"
            dangerouslySetInnerHTML={{ __html: b.value! }}
          />
        </section>
      ))}

      <section className="mb-8">
        <h2 className="mb-3 text-base font-semibold text-zinc-900">Histórico de Professores</h2>
        {professors.length === 0 ? (
          <p className="text-sm text-zinc-400">Nenhum registro de histórico.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {professors.map((prof) => {
              const userId = prof.professors?.user_id ?? null
              const avatarUrl = prof.professors?.avatar_url ?? null
              const inner = (
                <>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-zinc-200">
                      {avatarUrl ? (
                        <Image src={avatarUrl} alt={prof.professor_name} fill className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-400">
                          {prof.professor_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <p className="truncate text-sm font-medium text-zinc-800">{prof.professor_name}</p>
                  </div>
                  {prof.period && <span className="shrink-0 text-xs text-zinc-400">{prof.period}</span>}
                </>
              )

              const className = 'flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2'

              if (userId) {
                return (
                  <Link key={prof.id} href={`/usuarios/${userId}`} className={`${className} transition hover:bg-zinc-100`}>
                    {inner}
                  </Link>
                )
              }

              return (
                <div key={prof.id} className={className}>
                  {inner}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function Marker({ label, active }: { label: string; active: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 leading-none">
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
          active ? 'border-[#2F9E41] bg-[#2F9E41] text-white' : 'border-zinc-300 bg-white text-transparent'
        }`}
      >
        {active && (
          <svg width={10} height={10} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8l3.5 3.5L13 5" />
          </svg>
        )}
      </span>
      <span className={active ? 'font-semibold text-zinc-900' : 'text-zinc-500'}>{label}</span>
    </span>
  )
}
