import Image from 'next/image'

type UpcomingEntry = {
  title: string
  start_date: string | null
  end_date: string | null
}

const TIPS = [
  'VocÃª pode exportar o calendÃ¡rio acadÃªmico completo em Excel direto do painel admin.',
  'Acompanhe seus pontos de XP no Perfil â€” complete atividades para subir de nÃ­vel!',
  'O FÃ³rum Ã© o lugar certo para tirar dÃºvidas com colegas e professores.',
  'Veja todos os projetos de alunos na seÃ§Ã£o Projetos â€” inspire-se e colabore!',
  'Na aba Curso vocÃª encontra a grade curricular completa do ADS com detalhes de cada disciplina.',
  'Compartilhe artigos sobre tecnologia diretamente na plataforma e ganhe XP.',
  'Fique de olho nos prazos de rematrÃ­cula no CalendÃ¡rio â€” nunca mais perca um prazo!',
  'ConheÃ§a o corpo docente do ADS na aba Curso â€” cada professor tem Ã¡reas de interesse.',
  'Participe de hackathons e maratonas de programaÃ§Ã£o para ganhar experiÃªncia prÃ¡tica!',
  'Coloque seu GitHub e LinkedIn no Perfil para ser notado por empresas parceiras.',
  'O PPC do curso estÃ¡ disponÃ­vel na seÃ§Ã£o Curso para consulta a qualquer momento.',
  'Responder perguntas no FÃ³rum ajuda colegas e ainda rende XP para vocÃª.',
  'Explore os projetos aprovados para ver exemplos de trabalhos de qualidade do curso.',
  'Sua senha pode ser alterada a qualquer momento nas configuraÃ§Ãµes do Perfil.',
]

function parseLocalDate(str: string) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function getNextUpcoming(entries: UpcomingEntry[]): { entry: UpcomingEntry; daysLeft: number } | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcoming = entries
    .filter((e) => {
      if (!e.start_date) return false
      const end = e.end_date ? parseLocalDate(e.end_date) : parseLocalDate(e.start_date)
      return end >= today
    })
    .sort((a, b) => parseLocalDate(a.start_date!).getTime() - parseLocalDate(b.start_date!).getTime())

  if (upcoming.length === 0) return null

  const next = upcoming[0]
  const startDate = parseLocalDate(next.start_date!)
  const daysLeft = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return { entry: next, daysLeft }
}

function getDailyTip(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  )
  return TIPS[dayOfYear % TIPS.length]
}

export default function MascoteCard({ entries }: { entries: UpcomingEntry[] }) {
  const next = getNextUpcoming(entries)
  const tip = getDailyTip()

  const accentColor = !next || next.daysLeft > 3
    ? '#2F9E41'
    : next.daysLeft <= 0
    ? '#e11d48'
    : '#f59e0b'

  const countdownLabel = !next
    ? null
    : next.daysLeft <= 0
    ? 'Ã‰ hoje!'
    : next.daysLeft === 1
    ? 'AmanhÃ£!'
    : `Faltam ${next.daysLeft} dias`

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">

      <div
        className="relative flex items-end justify-between px-4 pt-4"
        style={{ background: 'linear-gradient(145deg, #edfaf1 0%, #ffffff 70%)' }}
      >
        <div className="pb-3 flex flex-col gap-0.5">
          <p className="text-sm font-bold text-zinc-900">ADS Bot</p>
          <p className="text-xs text-zinc-400">Assistente do ADS</p>
          <div
            className="mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ backgroundColor: '#2F9E41', color: '#fff' }}
          >
            <span>â—</span> Online
          </div>
        </div>

        <div className="relative w-28 h-28 shrink-0 self-end">
          <Image
            src="/mascote.png"
            alt="Mascote ADS"
            fill
            className="object-contain object-bottom drop-shadow-md"
            sizes="112px"
            priority
          />
        </div>
      </div>

      <div className="px-4 pb-4 pt-3 flex flex-col gap-3">

        {next && countdownLabel ? (
          <div
            className="rounded-xl px-3 py-2.5"
            style={{ backgroundColor: `${accentColor}12`, border: `1px solid ${accentColor}30` }}
          >
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: accentColor }}>
              {countdownLabel}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-zinc-800 leading-snug line-clamp-2">
              {next.entry.title}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5">
            <p className="text-xs text-zinc-400">Nenhum evento prÃ³ximo por enquanto.</p>
          </div>
        )}

        <div className="flex gap-2 rounded-xl bg-zinc-50 px-3 py-2.5">
          <span className="text-sm leading-none mt-0.5">ðŸ’¡</span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">Dica do dia</p>
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-600">{tip}</p>
          </div>
        </div>

      </div>
    </div>
  )
}
