import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'

export default async function CorpoDocentePage() {
  const { data: professors } = await supabase
    .from('professors')
    .select('id, name, avatar_url, bio, cargo, years_at_if')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  return (
    <div className="min-h-screen bg-white">

      <div className="bg-white text-zinc-900 py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-3">
            Análise e Desenvolvimento de Sistemas
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold mb-2">Corpo Docente</h1>
          <p className="text-zinc-400">Conheça os professores do curso</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-16">
        {!professors || professors.length === 0 ? (
          <p className="text-center text-zinc-400 py-20">Nenhum professor cadastrado ainda.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {professors.map((prof) => (
              <div
                key={prof.id}
                className="flex flex-col items-center text-center p-6 rounded-2xl border border-zinc-200 hover:border-zinc-300 hover:shadow-sm transition"
              >
                <div className="relative w-24 h-24 rounded-full overflow-hidden bg-zinc-100 border-2 border-zinc-200 mb-4">
                  {prof.avatar_url ? (
                    <Image src={prof.avatar_url} alt={prof.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl text-zinc-300 font-medium">
                      {prof.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <h2 className="text-base font-semibold text-zinc-900">{prof.name}</h2>

                {prof.cargo && (
                  <p className="text-sm text-zinc-500 mt-0.5">{prof.cargo}</p>
                )}

                {prof.years_at_if != null && prof.years_at_if > 0 && (
                  <span className="mt-2 rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">
                    {prof.years_at_if} {prof.years_at_if === 1 ? 'ano' : 'anos'} no IF
                  </span>
                )}

                {prof.bio && (
                  <p className="mt-3 text-xs text-zinc-400 line-clamp-3">{prof.bio}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
