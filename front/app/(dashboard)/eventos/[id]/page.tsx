import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import LikeButton from '@/app/components/LikeButton'
import ShareProjectButton from '@/app/components/ShareProjectButton'
import Comments from '@/app/components/Comments'
import EventReminderButton from '@/app/components/EventReminderButton'

export const dynamic = 'force-dynamic'

function formatDate(date: string | null) {
  if (!date) return null
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function EventoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> }) {
  const { id } = await params
  const { from } = await searchParams
  const backHref = from === 'calendario' ? '/calendario' : '/eventos'
  const backLabel = from === 'calendario' ? 'Calendário' : 'Eventos'

  const [{ data: event }, { data: categoriesData }, { data: contributorsData }] = await Promise.all([
    supabase.from('events').select('*, speaker:speaker_user_id(id, name, avatar_url)').eq('id', id).single(),
    supabase.from('event_categories').select('value, label'),
    supabase
      .from('event_contributors')
      .select('id, name, user_id, user:user_id(id, name, avatar_url)')
      .eq('event_id', id)
      .order('display_order')
      .order('created_at'),
  ])

  const categoryLabel: Record<string, string> = Object.fromEntries(
    (categoriesData ?? []).map((c: { value: string; label: string }) => [c.value, c.label])
  )

  if (!event) notFound()

  const rawContributors = (contributorsData ?? []) as unknown as {
    id: string
    name: string
    user_id: string | null
    user: { id: string; name: string; avatar_url: string | null } | null
  }[]

  const contributorUserIdsWithoutAvatar = rawContributors
    .filter((contributor) => contributor.user_id && !contributor.user?.avatar_url)
    .map((contributor) => contributor.user_id!)

  const { data: professorAvatarsData } = contributorUserIdsWithoutAvatar.length > 0
    ? await supabase
      .from('professors')
      .select('user_id, avatar_url')
      .in('user_id', contributorUserIdsWithoutAvatar)
    : { data: [] }

  const professorAvatarByUserId = new Map(
    ((professorAvatarsData ?? []) as { user_id: string | null; avatar_url: string | null }[])
      .filter((professor) => professor.user_id && professor.avatar_url)
      .map((professor) => [professor.user_id!, professor.avatar_url])
  )

  const contributors = rawContributors.map((contributor) => ({
    ...contributor,
    user: contributor.user ? {
      ...contributor.user,
      avatar_url: contributor.user.avatar_url ?? professorAvatarByUserId.get(contributor.user.id) ?? null,
    } : contributor.user,
  }))

  const { data: relatedProjects } = await supabase
    .from('projects')
    .select('id, title, description, like_count, project_tags(tag_name), users(name)')
    .eq('category', event.category)
    .order('like_count', { ascending: false })
    .limit(4)

  return (
    <div className="px-4 md:px-6 py-8 w-full">

      <Link href={backHref} className="text-sm text-zinc-400 hover:text-zinc-700 transition mb-8 inline-flex items-center gap-1.5">
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
        {backLabel}
      </Link>

      
      {event.banner_url && (
        <div className="mx-auto mb-8 w-full max-w-4xl overflow-hidden rounded-2xl">
         
          <img
            src={event.banner_url}
            alt={event.title}
            className="block h-auto w-full"
          />
        </div>
      )}

    
      <div className="flex flex-col gap-3 mb-10">
        <div className="flex items-center gap-2">
          {event.category && (
            <span className="text-xs font-semibold text-[#2F9E41]">
              {categoryLabel[event.category] ?? event.category}
            </span>
          )}
          {event.edition && (
            <span className="text-xs text-zinc-400">· {event.edition}</span>
          )}
        </div>
        <h1 className="text-3xl font-black text-zinc-900 leading-tight">{event.title}</h1>
        {event.description && (
          <p className="text-base text-zinc-500 leading-relaxed max-w-4xl">{event.description}</p>
        )}
      </div>

     
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
        {event.start_date && (
          <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-4">
            <p className="text-xs text-zinc-400 mb-1">Início</p>
            <p className="text-sm font-semibold text-zinc-900">{formatDate(event.start_date)}</p>
            {event.start_time && (
              <p className="text-xs text-zinc-400 mt-0.5">{event.start_time.slice(0, 5)}h</p>
            )}
          </div>
        )}
        {event.end_date && (
          <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-4">
            <p className="text-xs text-zinc-400  mb-1">Encerramento</p>
            <p className="text-sm font-semibold text-zinc-900">{formatDate(event.end_date)}</p>
          </div>
        )}
        <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-4">
          <p className="text-xs text-zinc-400  mb-1">Inscrições</p>
          <p className="text-sm font-semibold text-zinc-900">
            {event.registration_open === true
              ? 'Abertas'
              : event.registration_open === false
                ? 'Encerradas'
                : event.start_date && new Date(event.start_date) < new Date()
                  ? 'Encerradas'
                  : 'Em breve'}
          </p>
        </div>
      </div>

      {event.countdown_url && (
        <div className="mb-10">
          <p className="mb-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Contagem regressiva</p>
          <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50">
            <iframe
              src={event.countdown_url}
              title="Contagem regressiva do evento"
              className="h-64 w-full border-0"
              loading="lazy"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
          <a
            href={event.countdown_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition"
          >
            Abrir contador em nova aba
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
        </div>
      )}

      {event.speaker_name && (() => {
        const linkedUser = event.speaker as { id: string; name: string; avatar_url: string | null } | null
        return (
          <div className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 mb-6 w-fit">
            {linkedUser?.avatar_url ? (
              <Image src={linkedUser.avatar_url} alt={linkedUser.name} width={36} height={36} className="h-9 w-9 rounded-full object-cover shrink-0" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-zinc-200 flex items-center justify-center text-sm font-semibold text-zinc-600 shrink-0">
                {event.speaker_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-[11px] font-medium text-zinc-400">Responsável / Palestrante</p>
              {linkedUser ? (
                <Link href={`/usuarios/${linkedUser.id}`} className="text-sm font-semibold text-zinc-900 hover:text-[#2F9E41] transition">
                  {event.speaker_name}
                </Link>
              ) : (
                <p className="text-sm font-semibold text-zinc-900">{event.speaker_name}</p>
              )}
            </div>
          </div>
        )
      })()}

      <div className="mb-12 flex flex-wrap items-center gap-2">
        {event.registration_open && event.registration_url && (
          <a
            href={event.registration_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full px-6 py-2 text-sm font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: '#2F9E41' }}
          >
            Inscrever-se
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </a>
        )}
        <LikeButton
          type="event"
          targetId={event.id}
          initialCount={0}
          label="Curtir evento"
          variant="action"
          summaryTargetId={`event-reactions-${event.id}`}
        />
        <EventReminderButton eventId={event.id} startDate={event.start_date} />
        <ShareProjectButton title={event.title} label="Compartilhar evento" />
        <span id={`event-reactions-${event.id}`} className="contents" />
      </div>

      
      {/* {relatedProjects && relatedProjects.length > 0 && (
        <section>
          <p className="text-xs font-semibold text-zinc-400 mb-5">
            Projetos desta categoria
          </p>
          <div className="flex flex-col gap-3">
            {relatedProjects.map((project) => {
              const tags = project.project_tags as { tag_name: string }[]
              const author = project.users as unknown as { name: string } | null
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
                      <span key={tag_name} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs capitalize text-zinc-500">
                        {tag_name}
                      </span>
                    ))}
                  </div>
                </Link>
              )
            })}
          </div>
          <Link href={`/projetos?category=${event.category}`} className="text-sm text-[#2F9E41] hover:opacity-70 transition mt-4 inline-flex items-center gap-1">
            Ver todos
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </Link>
        </section>
      )} */}

      {contributors.length > 0 && (
        <section className="mb-12">
          <div className="mb-3">
            <h2 className="mt-1 text-lg font-bold text-zinc-900">Apoiadores</h2>
          </div>
          <div className="flex flex-wrap items-start justify-start gap-3">
            {contributors.map((contributor) => (
              <ContributorBadge key={contributor.id} contributor={contributor} />
            ))}
          </div>
        </section>
      )}

      <Comments type="event" targetId={event.id} />

    </div>
  )
}

function ContributorBadge({
  contributor,
}: {
  contributor: {
    name: string
    user_id: string | null
    user: { id: string; name: string; avatar_url: string | null } | null
  }
}) {
  const content = (
    <>
      {contributor.user?.avatar_url && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-100">
          <Image src={contributor.user.avatar_url} alt="" width={24} height={24} className="h-full w-full object-cover" />
        </span>
      )}
      <span className="truncate text-sm font-semibold text-zinc-800">{contributor.name}</span>
    </>
  )

  if (contributor.user_id) {
    return (
      <Link href={`/usuarios/${contributor.user_id}`} className={`inline-flex max-w-full items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 py-1.5 pr-4 transition hover:border-[#2F9E41]/30 hover:bg-[#2F9E41]/5 ${contributor.user?.avatar_url ? 'pl-1.5' : 'pl-4'}`}>
        {content}
      </Link>
    )
  }

  return <span className={`inline-flex max-w-full items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 py-1.5 pr-4 ${contributor.user?.avatar_url ? 'pl-1.5' : 'pl-4'}`}>{content}</span>
}
