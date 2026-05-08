import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'

export const dynamic = 'force-dynamic'

const CATEGORY_LABELS: Record<string, string> = {
  hackathon: 'Hackathon',
  maratona: 'Maratona',
  extensao: 'Extensão',
  iniciacao_cientifica: 'Iniciação Científica',
}

function formatDate(date: string | null) {
  if (!date) return null
  return new Date(date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function EventosPage() {
  const { data: events } = await supabase
    .from('events')
    .select('id, title, edition, category, description, start_date, end_date, registration_open, banner_url')
    .eq('is_active', true)
    .order('start_date', { ascending: false })

  const upcoming = (events ?? []).filter((e) => e.start_date && new Date(e.start_date) >= new Date())
  const past = (events ?? []).filter((e) => !e.start_date || new Date(e.start_date) < new Date())

  return (
    <div className="px-4 md:px-6 py-8 w-full">
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-zinc-900">Eventos</h1>
        <p className="text-sm text-zinc-500 mt-1">Hackathons, maratonas, extensão e muito mais.</p>
      </div>

      {!events || events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-16 text-center">
          <p className="text-sm text-zinc-400">Nenhum evento cadastrado ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-12">

          {upcoming.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-zinc-400 mb-5">Próximos</p>
              <div className="flex flex-col gap-4">
                {upcoming.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-zinc-400 mb-5">Anteriores</p>
              <div className="flex flex-col gap-4">
                {past.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          )}

        </div>
      )}
    </div>
  )
}

function EventCard({ event }: {
  event: {
    id: string
    title: string
    edition: string | null
    category: string | null
    description: string | null
    start_date: string | null
    end_date: string | null
    registration_open: boolean
    banner_url: string | null
  }
}) {
  return (
    <Link
      href={`/eventos/${event.id}`}
      className={`grid gap-8 items-center py-6 border-b border-zinc-100 last:border-0 hover:opacity-80 transition-opacity ${
        event.banner_url ? 'grid-cols-[1fr_auto]' : 'grid-cols-1'
      }`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {event.category && (
            <span className="text-xs font-semibold text-[#2F9E41]">
              {CATEGORY_LABELS[event.category] ?? event.category}
            </span>
          )}
          {event.edition && (
            <span className="text-xs text-zinc-400">{event.edition}</span>
          )}
        </div>
        <h2 className="text-xl font-black text-zinc-900 leading-tight">{event.title}</h2>
        {event.description && (
          <p className="text-sm text-zinc-500 leading-relaxed line-clamp-2">{event.description}</p>
        )}
        <div className="flex items-center gap-4 mt-1">
          {event.start_date && (
            <span className="text-xs text-zinc-400">{formatDate(event.start_date)}</span>
          )}
          {event.registration_open && (
            <span className="text-xs font-semibold text-white bg-[#2F9E41] rounded-full px-3 py-0.5">
              Inscrições abertas
            </span>
          )}
        </div>
      </div>

      {event.banner_url && (
        <div className="relative w-36 h-24 rounded-xl overflow-hidden shrink-0">
          <Image src={event.banner_url} alt={event.title} fill className="object-cover" />
        </div>
      )}
    </Link>
  )
}
