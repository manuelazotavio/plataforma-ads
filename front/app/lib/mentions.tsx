import Link from 'next/link'

const MENTION_RE = /@\[([^\]]+)\]\(([^)]+)\)/g

export function parseMentions(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null
  MENTION_RE.lastIndex = 0
  while ((match = MENTION_RE.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    const [, name, userId] = match
    parts.push(
      <Link
        key={match.index}
        href={`/usuarios/${userId}`}
        className="font-semibold text-blue-500 hover:underline"
      >
        @{name}
      </Link>
    )
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

export function injectMentionsIntoHtml(html: string): string {
  return html.replace(
    /@\[([^\]]+)\]\(([^)]+)\)/g,
    (_m, name, userId) =>
      `<a href="/usuarios/${userId}" class="font-semibold text-blue-500 hover:underline">@${name}</a>`
  )
}
