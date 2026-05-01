import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

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

export default async function EventoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (!event) notFound()

  const { data: relatedProjects } = await supabase
    .from('projects')
    .select('id, title, description, like_count, project_tags(tag_name), users(name)')
    .eq('category', event.category)
    .order('like_count', { ascending: false })
    .limit(4)

  return (
    <div className="px-10 py-8 max-w-4xl mx-auto w-full">

      <Link href="/eventos" className="text-sm text-zinc-400 hover:text-zinc-700 transition mb-8 inline-flex items-center gap-1.5">
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
        Eventos
      </Link>

      
      {event.banner_url && (
        <div className="relative w-full h-56 rounded-2xl overflow-hidden mb-8">
          <Image src={event.banner_url} alt={event.title} fill className="object-cover" />
        </div>
      )}

    
      <div className="flex flex-col gap-3 mb-10">
        <div className="flex items-center gap-2">
          {event.category && (
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0B7A3B]">
              {CATEGORY_LABELS[event.category] ?? event.category}
            </span>
          )}
          {event.edition && (
            <span className="text-xs text-zinc-400">· {event.edition}</span>
          )}
        </div>
        <h1 className="text-3xl font-black text-zinc-900 leading-tight">{event.title}</h1>
        {event.description && (
          <p className="text-base text-zinc-500 leading-relaxed max-w-2xl">{event.description}</p>
        )}
      </div>

     
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
        {event.start_date && (
          <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-4">
            <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Início</p>
            <p className="text-sm font-semibold text-zinc-900">{formatDate(event.start_date)}</p>
          </div>
        )}
        {event.end_date && (
          <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-4">
            <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Encerramento</p>
            <p className="text-sm font-semibold text-zinc-900">{formatDate(event.end_date)}</p>
          </div>
        )}
        <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-4">
          <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Inscrições</p>
          <p className="text-sm font-semibold text-zinc-900">
            {event.registration_open ? 'Abertas' : 'Encerradas'}
          </p>
        </div>
      </div>

     
     
      {event.registration_open && event.registration_url && (
        <a
          href={event.registration_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-bold text-white mb-12 transition hover:opacity-90"
          style={{ backgroundColor: '#0B7A3B' }}
        >
          Inscrever-se ↗
        </a>
      )}

      
      {relatedProjects && relatedProjects.length > 0 && (
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-5">
            Projetos desta categoria
          </p>
          <div className="flex flex-col gap-3">
            {relatedProjects.map((project) => {
              const tags = project.project_tags as { tag_name: string }[]
              const author = project.users as { name: string } | null
              return (
                <Link
                  key={project.id}
                  href={`/projetos/${project.id}`}
                  className="flex items-center justify-between gap-6 py-4 border-b border-zinc-100 last:border-0 hover:opacity-70 transition-opacity"
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 truncate">{project.title}</p>
                    <p className="text-xs text-zinc-400">{author?.name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {tags.slice(0, 2).map(({ tag_name }) => (
                      <span key={tag_name} className="text-xs text-zinc-500 bg-zinc-100 rounded-full px-2 py-0.5">
                        {tag_name}
                      </span>
                    ))}
                  </div>
                </Link>
              )
            })}
          </div>
          <Link href={`/projetos?category=${event.category}`} className="text-sm text-[#0B7A3B] hover:opacity-70 transition mt-4 inline-flex items-center gap-1">
            Ver todos
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </Link>
        </section>
      )}

    </div>
  )
}
