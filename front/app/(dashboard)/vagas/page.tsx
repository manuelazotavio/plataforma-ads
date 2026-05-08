import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

export const dynamic = 'force-dynamic'

const CATEGORIES = [
  { value: 'estagio',         label: 'Estágios' },
  { value: 'bolsa',           label: 'Bolsas' },
  { value: 'evento_externo',  label: 'Eventos externos' },
]

export default async function VagasPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams

  let query = supabase
    .from('jobs')
    .select('id, position, company, location, job_type, work_mode, application_url, category, created_at, job_tags(tag_name)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (category) query = query.eq('category', category)

  const { data: jobs } = await query

  return (
    <div className="px-4 md:px-10 py-8 max-w-5xl mx-auto w-full">

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Oportunidades</h1>
        <p className="text-sm text-zinc-500 mt-1">Estágios, bolsas e eventos externos para alunos de ADS.</p>
      </div>
      <div className="-mx-4 px-4 md:mx-0 md:px-0 mb-8">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1 md:flex-wrap">
          <Link
            href="/vagas"
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors whitespace-nowrap ${
              !category ? 'text-white' : 'text-zinc-400 hover:text-zinc-700'
            }`}
            style={!category ? { backgroundColor: '#2F9E41' } : undefined}
          >
            Todas
          </Link>
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.value}
              href={`/vagas?category=${cat.value}`}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors whitespace-nowrap ${
                category === cat.value ? 'text-white' : 'text-zinc-400 hover:text-zinc-700'
              }`}
              style={category === cat.value ? { backgroundColor: '#2F9E41' } : undefined}
            >
              {cat.label}
            </Link>
          ))}
        </div>
      </div>

      {!jobs || jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-12 text-center">
          <p className="text-sm text-zinc-400">Nenhuma oportunidade encontrada.</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-zinc-100">
          {jobs.map((job) => {
            const tags = job.job_tags as { tag_name: string }[]
            const cat = CATEGORIES.find((c) => c.value === job.category)
            return (
              <div key={job.id} className="py-5 md:py-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between md:gap-8">
                <div className="flex flex-col gap-1.5 md:gap-2 min-w-0">

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    {cat && (
                      <span className="text-xs font-semibold text-[#2F9E41]">{cat.label}</span>
                    )}
                    {job.job_type && (
                      <span className="text-xs text-zinc-400">{job.job_type}</span>
                    )}
                  </div>

                  <p className="text-base md:text-xl font-black text-zinc-900 leading-snug">
                    {job.position}
                  </p>

                  <p className="text-sm text-zinc-500 leading-snug">
                    {job.company}
                    {job.location  ? ` · ${job.location}`  : ''}
                    {job.work_mode ? ` · ${job.work_mode}` : ''}
                  </p>

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                      {tags.map(({ tag_name }) => (
                        <span key={tag_name} className="text-xs text-zinc-500 border border-zinc-200 rounded-full px-2.5 py-0.5">
                          {tag_name}
                        </span>
                      ))}
                    </div>
                  )}

                </div>

                <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                  <span className="text-xs text-zinc-400 whitespace-nowrap">
                    {new Date(job.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                  </span>
                  {job.application_url && (
                    <a
                      href={job.application_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-xl bg-[#2F9E41] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                    >
                      Acessar vaga
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
