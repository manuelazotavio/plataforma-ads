import Link from 'next/link'
import Image from 'next/image'

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

function ItemCard({ item, className = '' }: { item: ProfileActivityItem; className?: string }) {
  return (
    <Link
      href={item.href}
      className={`group block break-inside-avoid overflow-hidden rounded-xl border border-zinc-200 bg-white transition hover:border-zinc-300 hover:shadow-sm ${className}`}
    >
      {item.imageUrl && (
        <div className="relative aspect-video w-full bg-zinc-100">
          {isVideoMedia(item) ? (
            <video src={item.imageUrl} className="h-full w-full object-cover" autoPlay muted loop playsInline preload="metadata" />
          ) : (
            <Image src={item.imageUrl} alt={item.title} fill className="object-cover" sizes="(min-width: 768px) 50vw, 100vw" />
          )}
        </div>
      )}
      <div className="min-w-0 p-3">
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
        <h3 className="text-[13px] font-semibold text-zinc-900 transition group-hover:text-[#2F9E41]">
          {item.title}
        </h3>
        {item.description && (
          <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-zinc-500">
            {item.description}
          </p>
        )}
        {item.meta && (
          <span className="mt-3 block text-xs text-zinc-400">{item.meta}</span>
        )}
      </div>
    </Link>
  )
}

export default function ProfileActivityFeed({ items }: { items: ProfileActivityItem[] }) {
  return (
    <section className="mt-5 rounded-xl border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold text-zinc-900">Publicações</h2>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-200 p-8 text-center">
          <p className="text-sm text-zinc-400">Nenhuma publicação ainda.</p>
        </div>
      ) : items.length === 1 ? (
        <div className="flex justify-center">
          <ItemCard item={items[0]} className="w-full md:max-w-3xl" />
        </div>
      ) : items.length === 2 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <ItemCard key={`${item.type}-${item.id}`} item={item} />
          ))}
        </div>
      ) : (
        <div className="columns-1 gap-3 md:columns-2 xl:columns-3">
          {items.map((item) => (
            <ItemCard key={`${item.type}-${item.id}`} item={item} className="mb-3" />
          ))}
        </div>
      )}
    </section>
  )
}
