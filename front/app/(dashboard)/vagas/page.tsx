import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

export const dynamic = 'force-dynamic'

const CATEGORIES = [
  { value: 'estagio', label: 'Estágios' },
  { value: 'bolsa', label: 'Bolsas' },
  { value: 'evento_externo', label: 'Eventos externos' },
]

export default async function VagasPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams

  let query = supabase
    .from('jobs')
    .select('id, position, company, location, job_type, work_mode, category, created_at, job_tags(tag_name)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (category) query = query.eq('category', category)

  const { data: jobs } = await query

  return (
    <div className="px-4 md:px-10 py-8 max-w-5xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Oportunidades</h1>
        <p className="text-sm text-zinc-500 mt-1">Estágios, bolsas e eventos externos para alunos de ADS.</p>
      </div>

     
      <div className="flex gap-2 mb-8">
        <Link
          href="/vagas"
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
            !category ? 'text-white' : 'text-zinc-400 hover:text-zinc-700'
          }`}
          style={!category ? { backgroundColor: '#0B7A3B' } : undefined}
        >
          Todas
        </Link>
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.value}
            href={`/vagas?category=${cat.value}`}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              category === cat.value ? 'text-white' : 'text-zinc-400 hover:text-zinc-700'
            }`}
            style={category === cat.value ? { backgroundColor: '#0B7A3B' } : undefined}
          >
            {cat.label}
          </Link>
        ))}
      </div>

      {!jobs || jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-16 text-center">
          <p className="text-sm text-zinc-400">Nenhuma oportunidade encontrada.</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-zinc-100">
          {jobs.map((job) => {
            const tags = job.job_tags as { tag_name: string }[]
            const cat = CATEGORIES.find((c) => c.value === job.category)
            return (
              <div key={job.id} className="py-6 flex items-start justify-between gap-8">
                <div className="flex flex-col gap-2 min-w-0">
                  <div className="flex items-center gap-2">
                    {cat && (
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#0B7A3B]">
                        {cat.label}
                      </span>
                    )}
                    {job.job_type && (
                      <span className="text-xs text-zinc-400">{job.job_type}</span>
                    )}
                  </div>
                  <p className="text-xl font-black text-zinc-900 leading-tight">{job.position}</p>
                  <p className="text-sm text-zinc-500">
                    {job.company}{job.location ? ` · ${job.location}` : ''}{job.work_mode ? ` · ${job.work_mode}` : ''}
                  </p>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {tags.map(({ tag_name }) => (
                        <span key={tag_name} className="text-xs text-zinc-500 border border-zinc-200 rounded-full px-3 py-1">
                          {tag_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-xs text-zinc-400 shrink-0 pt-1">
                  {new Date(job.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
