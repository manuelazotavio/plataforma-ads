import Link from 'next/link'

type Props = {
  page: number
  totalCount: number
  pageSize: number
  searchParams: Record<string, string | string[] | undefined>
}

export default function Pagination({ page, totalCount, pageSize, searchParams }: Props) {
  const totalPages = Math.ceil(totalCount / pageSize)
  if (totalPages <= 1) return null

  function pageUrl(p: number) {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(searchParams)) {
      if (k === 'page') continue
      if (Array.isArray(v)) v.forEach((val) => params.append(k, val))
      else if (v != null) params.set(k, v)
    }
    params.set('page', String(p))
    return `?${params.toString()}`
  }

  const hasPrev = page > 1
  const hasNext = page < totalPages

  const pages: (number | '...')[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  return (
    <div className="mt-10 flex items-center justify-center gap-1.5">
      <Link
        href={hasPrev ? pageUrl(page - 1) : '#'}
        aria-disabled={!hasPrev}
        className={`rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium transition ${
          hasPrev ? 'text-zinc-700 hover:bg-zinc-50' : 'pointer-events-none text-zinc-300'
        }`}
      >
        ←
      </Link>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`dots-${i}`} className="px-1 text-sm text-zinc-400">…</span>
        ) : (
          <Link
            key={p}
            href={pageUrl(p)}
            className={`min-w-9 rounded-lg border px-3 py-2 text-center text-sm font-medium transition ${
              p === page
                ? 'border-[#2F9E41] bg-[#2F9E41] text-white'
                : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            {p}
          </Link>
        )
      )}

      <Link
        href={hasNext ? pageUrl(page + 1) : '#'}
        aria-disabled={!hasNext}
        className={`rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium transition ${
          hasNext ? 'text-zinc-700 hover:bg-zinc-50' : 'pointer-events-none text-zinc-300'
        }`}
      >
        →
      </Link>
    </div>
  )
}
