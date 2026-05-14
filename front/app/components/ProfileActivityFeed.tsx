import Link from 'next/link'

export type ProfileActivityItem = {
  id: string
  type: 'project' | 'article' | 'topic'
  title: string
  description: string | null
  href: string
  date: string
  isPinned?: boolean
  meta?: string
  imageUrl?: string | null
  imageType?: string | null
}

const typeLabels: Record<ProfileActivityItem['type'], string> = {
  project: 'Projeto',
  article: 'Artigo',
  topic: 'Tópico',
}

export default function ProfileActivityFeed({ items }: { items: ProfileActivityItem[] }) {
  return (
    <section className="border-t border-zinc-100 py-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Publicações</h2>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center">
          <p className="text-sm text-zinc-400">Nenhuma publicação ainda.</p>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
          {items.map((item) => (
            <Link
              key={`${item.type}-${item.id}`}
              href={item.href}
              className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white transition hover:border-zinc-300 hover:shadow-sm"
            >
              {item.imageUrl && (
                <div className="aspect-[16/9] w-full bg-zinc-100">
                  {isVideoMedia(item) ? (
                    <video src={item.imageUrl} className="h-full w-full object-cover" autoPlay muted loop playsInline preload="metadata" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                  )}
                </div>
              )}
              <div className="min-w-0 p-4">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-500">
                    {typeLabels[item.type]}
                  </span>
                  {item.isPinned && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                        <path d="m14.5 4.5 5 5" />
                        <path d="m9 10-4 4" />
                        <path d="m7 12 5 5" />
                        <path d="m16 3 5 5-5.5 5.5-5-5Z" />
                        <path d="M5 19 9 15" />
                      </svg>
                      Fixado
                    </span>
                  )}
                  <span className="text-xs text-zinc-400">{formatDate(item.date)}</span>
                </div>
                <h3 className="text-sm font-semibold text-zinc-900 transition group-hover:text-[#2F9E41]">
                  {item.title}
                </h3>
                {item.description && (
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-zinc-500">
                    {item.description}
                  </p>
                )}
                {item.meta && (
                  <span className="mt-4 block text-xs text-zinc-400">{item.meta}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

function isVideoMedia(item: ProfileActivityItem) {
  if (item.imageType?.toLowerCase().includes('video')) return true
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(item.imageUrl ?? '')
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
