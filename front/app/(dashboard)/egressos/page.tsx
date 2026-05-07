import { supabase } from '@/app/lib/supabase'
import EgressosList from './EgressosList'

export const dynamic = 'force-dynamic'

export default async function EgressosPage() {
  const { data: egressos } = await supabase
    .from('egressos')
    .select('id, name, avatar_url, graduation_year, role, company, linkedin, bio')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  const years = [...new Set((egressos ?? []).map((e) => e.graduation_year).filter(Boolean))].sort((a, b) => (b ?? 0) - (a ?? 0))

  return (
    <div className="px-4 md:px-10 py-8 max-w-4xl mx-auto w-full">
      <div className="flex items-end justify-between mb-10">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Egressos</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Alunos formados pelo curso de ADS.
          </p>
        </div>
        {(egressos?.length ?? 0) > 0 && (
          <p className="text-sm text-zinc-400">
            {egressos!.length} egresso{egressos!.length !== 1 ? 's' : ''}
            {years.length > 0 && ` · turmas de ${years[years.length - 1]} a ${years[0]}`}
          </p>
        )}
      </div>

      {!egressos || egressos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-16 text-center">
          <p className="text-sm text-zinc-400">Nenhum egresso cadastrado ainda.</p>
        </div>
      ) : (
        <EgressosList egressos={egressos} />
      )}
    </div>
  )
}
