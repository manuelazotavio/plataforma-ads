import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'

export const dynamic = 'force-dynamic'

function formatDate(date: string | null) {
  if (!date) return null
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function EventosPage() {
  const [{ data: events }, { data: categoriesData }] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, edition, category, description, start_date, end_date, registration_open, banner_url')
      .eq('is_active', true)
      .order('start_date', { ascending: false }),
    supabase.from('event_categories').select('value, label'),
  ])

  const categoryLabel: Record<string, string> = Object.fromEntries(
    (categoriesData ?? []).map((c: { value: string; label: string }) => [c.value, c.label])
  )

  const upcoming = (events ?? []).filter((event) => event.start_date && new Date(event.start_date) >= new Date())
  const past = (events ?? []).filter((event) => !event.start_date || new Date(event.start_date) < new Date())

  return (
    <div className="w-full px-4 py-8 md:px-6">
      <div className="mx-auto mb-10 w-full max-w-2xl">
        <h1 className="text-2xl font-bold text-zinc-900">Eventos</h1>
        <p className="mt-1 text-sm text-zinc-500">Hackathons, maratonas, extensão e muito mais.</p>
      </div>

      {!events || events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-16 text-center">
          <p className="text-sm text-zinc-400">Nenhum evento cadastrado ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-12">
          {upcoming.length > 0 && (
            <section className="mx-auto w-full max-w-2xl">
              <p className="mb-5 text-xs font-semibold text-zinc-400">Próximos</p>
              <div className="flex flex-col gap-4">
                {upcoming.map((event) => (
                  <EventCard key={event.id} event={event} categoryLabel={categoryLabel} />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section className="mx-auto w-full max-w-2xl">
              <p className="mb-5 text-xs font-semibold text-zinc-400">Anteriores</p>
              <div className="flex flex-col gap-4">
                {past.map((event) => (
                  <EventCard key={event.id} event={event} categoryLabel={categoryLabel} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function EventCard({ event, categoryLabel }: {
  event: {
    id: string
    title: string
    edition: string | null
    category: string | null
    description: string | null
    start_date: string | null
    end_date: string | null
    registration_open: boolean | null
    banner_url: string | null
  }
  categoryLabel: Record<string, string>
}) {
  return (
    <Link
      href={`/eventos/${event.id}`}
      className="group flex overflow-hidden rounded-2xl border border-zinc-200 bg-white transition hover:border-zinc-300 hover:shadow-sm"
    >
      <div className="flex w-full flex-col">
        {event.banner_url && (
          <div className="relative h-56 bg-zinc-100 sm:h-72">
            <Image src={event.banner_url} alt={event.title} fill className="object-cover transition group-hover:scale-[1.01]" />
          </div>
        )}

        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {event.category && (
              <span className="rounded-full bg-[#2F9E41]/10 px-2.5 py-1 text-xs font-semibold text-[#2F9E41]">
                {categoryLabel[event.category] ?? event.category}
              </span>
            )}
            {event.edition && (
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500">{event.edition}</span>
            )}
            {event.registration_open === null && (
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-500">
                Em breve
              </span>
            )}
            {event.registration_open === true && (
              <span className="rounded-full bg-[#2F9E41] px-2.5 py-1 text-xs font-semibold text-white">
                Inscrições abertas
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-bold leading-tight text-zinc-900 transition group-hover:text-[#2F9E41]">{event.title}</h2>
            {event.description && (
              <p className="line-clamp-3 text-sm leading-relaxed text-zinc-500">{event.description}</p>
            )}
          </div>

          {event.start_date && (
            <span className="text-xs font-medium text-zinc-400">{formatDate(event.start_date)}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
