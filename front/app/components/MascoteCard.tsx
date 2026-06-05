import Image from 'next/image'

type UpcomingEntry = {
  title: string
  start_date: string | null
  end_date: string | null
}

const TIPS = [
  'Você pode exportar o calendário acadêmico completo em Excel direto do painel admin.',
  'Acompanhe seus pontos de XP no Perfil — complete atividades para subir de nível!',
  'O Fórum é o lugar certo para tirar dúvidas com colegas e professores.',
  'Veja todos os projetos de alunos na seção Projetos — inspire-se e colabore!',
  'Na aba Curso você encontra a grade curricular completa do ADS com detalhes de cada disciplina.',
  'Compartilhe artigos sobre tecnologia diretamente na plataforma e ganhe XP.',
  'Fique de olho nos prazos de rematrícula no Calendário — nunca mais perca um prazo!',
  'Conheça o corpo docente do ADS na aba Curso — cada professor tem áreas de interesse.',
  'Participe de hackathons e maratonas de programação para ganhar experiência prática!',
  'Coloque seu GitHub e LinkedIn no Perfil para ser notado por empresas parceiras.',
  'O PPC do curso está disponível na seção Curso para consulta a qualquer momento.',
  'Responder perguntas no Fórum ajuda colegas e ainda rende XP para você.',
  'Explore os projetos aprovados para ver exemplos de trabalhos de qualidade do curso.',
  'Sua senha pode ser alterada a qualquer momento nas configurações do Perfil.',
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
    ? 'É hoje!'
    : next.daysLeft === 1
    ? 'Amanhã!'
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
            <span>●</span> Online
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
            <p className="text-[11px] font-bold" style={{ color: accentColor }}>
              {countdownLabel}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-zinc-800 leading-snug line-clamp-2">
              {next.entry.title}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5">
            <p className="text-xs text-zinc-400">Nenhum evento próximo por enquanto.</p>
          </div>
        )}

        <div className="flex gap-2 rounded-xl bg-zinc-50 px-3 py-2.5">
          <span className="text-sm leading-none mt-0.5">💡</span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">Dica do dia</p>
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-600">{tip}</p>
          </div>
        </div>

      </div>
    </div>
  )
}
