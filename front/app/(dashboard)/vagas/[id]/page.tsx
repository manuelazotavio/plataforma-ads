import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

export const dynamic = 'force-dynamic'

const CATEGORIES = [
  { value: 'estagio', label: 'Estágios' },
  { value: 'bolsa', label: 'Bolsas' },
  { value: 'evento_externo', label: 'Eventos externos' },
]

type JobTag = {
  tag_name: string
}

type Job = {
  id: string
  position: string
  company: string
  location: string | null
  job_type: string | null
  work_mode: string | null
  application_url: string | null
  description: string | null
  requirements: string | null
  category: string | null
  created_at: string
  job_tags: JobTag[]
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data } = await supabase
    .from('jobs')
    .select('id, position, company, location, job_type, work_mode, application_url, description, requirements, category, created_at, job_tags(tag_name)')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (!data) notFound()

  const job = data as Job
  const category = CATEGORIES.find((item) => item.value === job.category)
  const tags = job.job_tags ?? []
  const meta = [
    job.company,
    job.location,
    job.work_mode ? formatLabel(job.work_mode) : null,
    job.job_type,
  ].filter(Boolean)

  return (
    <div className="px-4 py-8 md:px-6">
      <Link href="/vagas" className="mb-8 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-zinc-700">
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
        Voltar para oportunidades
      </Link>

      <article className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {category && (
              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-[#2F9E41]">
                {category.label}
              </span>
            )}
            <span className="text-xs text-zinc-400">
              Publicada em {new Date(job.created_at).toLocaleDateString('pt-BR')}
            </span>
          </div>

          <h1 className="text-3xl font-black leading-tight text-zinc-900 md:text-4xl">{job.position}</h1>

          <p className="mt-3 text-base leading-7 text-zinc-500">
            {meta.join(' · ')}
          </p>

          {tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {tags.map(({ tag_name }) => (
                <span key={tag_name} className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-500">
                  {formatLabel(tag_name)}
                </span>
              ))}
            </div>
          )}

          <div className="mt-10 flex flex-col gap-8">
            <section>
              <h2 className="text-base font-semibold text-zinc-900">Descrição</h2>
              {job.description ? (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-600">{job.description}</p>
              ) : (
                <p className="mt-3 text-sm text-zinc-400">Descrição ainda não cadastrada.</p>
              )}
            </section>

            {job.requirements && (
              <section>
                <h2 className="text-base font-semibold text-zinc-900">Requisitos</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-600">{job.requirements}</p>
              </section>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-zinc-900">Resumo</h2>
            <dl className="mt-4 flex flex-col gap-3 text-sm">
              <DetailItem label="Empresa" value={job.company} />
              <DetailItem label="Local" value={job.location} />
              <DetailItem label="Modalidade" value={job.work_mode ? formatLabel(job.work_mode) : null} />
              <DetailItem label="Tipo" value={job.job_type} />
            </dl>

            {job.application_url && (
              <a
                href={job.application_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[#2F9E41] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Acessar oportunidade
              </a>
            )}
          </div>
        </aside>
      </article>
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null

  return (
    <div>
      <dt className="text-xs font-medium text-zinc-400">{label}</dt>
      <dd className="mt-0.5 text-zinc-700">{value}</dd>
    </div>
  )
}

function formatLabel(value: string) {
  return value
    .split(/([\s/-]+)/)
    .map((part) => (/^[\s/-]+$/.test(part) ? part : part.charAt(0).toLocaleUpperCase('pt-BR') + part.slice(1)))
    .join('')
}
