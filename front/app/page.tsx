import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

type Project = {
  id: string
  title: string
  description: string | null
  updated_at: string
  like_count: number | null
  project_tags: { tag_name: string }[]
  users: { id: string; name: string; avatar_url: string | null; semester: number | null } | { id: string; name: string; avatar_url: string | null; semester: number | null }[] | null
}

type Topic = {
  id: string
  title: string
  created_at: string
  replies_count: number | null
  users: { name: string } | { name: string }[] | null
  forum_categories: { name: string } | { name: string }[] | null
}

type Contributor = {
  id: string
  name: string
  avatar_url: string | null
  semester: number | null
  totalLikes: number
}

const sidebarItems = [
  { href: '/', label: 'Inicio', icon: <IconHome /> },
  {
    href: '/curso',
    label: 'O curso',
    icon: <IconBook />,
    children: ['Sobre o curso', 'Matriz curricular', 'Professores', 'Infraestrutura'],
  },
  { href: '/projetos', label: 'Projetos', icon: <IconGrid /> },
  { href: '/eventos', label: 'Eventos', icon: <IconCalendar /> },
  { href: '/calendario', label: 'Calendario', icon: <IconCalendarGrid /> },
  { href: '/vagas', label: 'Oportunidades', icon: <IconBriefcase /> },
  { href: '/egressos', label: 'Egressos', icon: <IconUsers /> },
  {
    href: '/area-aluno',
    label: 'Area do Aluno',
    icon: <IconPerson />,
    children: ['Materiais', 'Orientacoes academicas', 'Links uteis'],
  },
  { href: '/contato', label: 'Contato', icon: <IconMessage /> },
]

export default async function HomePage() {
  const [
    { data: projects },
    { data: topics },
    { data: tags },
    { data: topProjects },
    { count: studentsCount },
    { count: projectsCount },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('id, title, description, updated_at, like_count, project_tags(tag_name), users(id, name, avatar_url, semester)')
      .order('like_count', { ascending: false })
      .limit(2),
    supabase
      .from('forum_topics')
      .select('id, title, created_at, replies_count, users(name), forum_categories(name)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('project_tags').select('tag_name').limit(50),
    supabase
      .from('projects')
      .select('like_count, users(id, name, avatar_url, semester)')
      .order('like_count', { ascending: false })
      .limit(50),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'aluno'),
    supabase.from('projects').select('*', { count: 'exact', head: true }),
  ])

  const featuredProjects = (projects ?? []) as unknown as Project[]
  const recentTopics = (topics ?? []) as unknown as Topic[]
  const popularTags = Array.from(new Set((tags ?? []).map((tag) => tag.tag_name))).slice(0, 6)
  const topContributors = getTopContributors(topProjects ?? [])

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <PublicSidebar />

      <div className="flex min-w-0 flex-1 flex-col ml-56">
        <PublicHeader />

        <main className="flex-1 overflow-y-auto bg-white">
          <div className="grid grid-cols-1 gap-7 px-5 py-6 lg:px-8 xl:grid-cols-[minmax(0,750px)_290px_300px]">
            <div className="flex min-w-0 flex-col gap-7">
              <WelcomeCard studentsCount={studentsCount ?? 0} projectsCount={projectsCount ?? 0} />
              <ProjectsSection projects={featuredProjects} />
              <TopicsSection topics={recentTopics} />
            </div>

            <div className="flex flex-col gap-4">
              <VisitorCard />
              {topContributors.length > 0 && <TopContributorsCard contributors={topContributors} />}
              {popularTags.length > 0 && <TagsCard tags={popularTags} />}
            </div>

            <div className="flex flex-col gap-4">
              <CalendarCard />
            </div>
          </div>

          <footer className="mt-8 border-t border-zinc-100 px-10 py-6">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-zinc-400">
              <Link href="/regras" className="transition hover:text-zinc-700">Regras do ADS Comunica</Link>
              <Link href="/privacidade" className="transition hover:text-zinc-700">Politica de Privacidade</Link>
              <Link href="/contrato" className="transition hover:text-zinc-700">Contrato de Usuario</Link>
              <Link href="/acessibilidade" className="transition hover:text-zinc-700">Acessibilidade</Link>
              <span className="ml-auto">ADS Comunica, Inc. &copy; 2026. Todos os direitos reservados.</span>
            </div>
          </footer>
        </main>

        <QuickCreateMenu />
      </div>
    </div>
  )
}

function PublicSidebar() {
  return (
    <aside className="fixed z-20 flex h-full w-56 shrink-0 flex-col border-r border-zinc-100 bg-white">
      <div className="flex h-16 items-center gap-2.5 border-b border-zinc-100 px-5">
        <div className="grid h-7 w-7 shrink-0 grid-cols-2 gap-0.5">
          <div className="rounded-sm bg-green-500" />
          <div className="rounded-sm bg-blue-400" />
          <div className="rounded-sm bg-yellow-400" />
          <div className="rounded-sm bg-red-400" />
        </div>
        <div className="leading-tight">
          <span className="block text-sm font-bold text-zinc-900">ADS</span>
          <span className="block text-sm font-bold text-zinc-900">Comunica</span>
        </div>
      </div>

      <nav className="sidebar-nav flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        {sidebarItems.map((item, i) => {
          const active = item.href === '/'
          const dividerBefore = i === 6
          return (
            <div key={item.href}>
              {dividerBefore && <div className="my-2 border-t border-zinc-100" />}
              <Link
                href={item.href}
                className={`flex min-w-0 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                  active ? 'text-white' : 'text-zinc-900 hover:bg-zinc-100'
                }`}
                style={active ? { backgroundColor: '#0B7A3B' } : undefined}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              </Link>
              {'children' in item && item.children && (
                <div className="ml-8 mt-1 flex flex-col gap-1 border-l border-zinc-100 pl-3">
                  {item.children.map((child) => (
                    <Link
                      key={child}
                      href={`${item.href}#${slugify(child)}`}
                      className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-900"
                    >
                      {child}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}

function PublicHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-end gap-4 border-b border-zinc-100 bg-white px-6">
      <div className="relative hidden sm:block">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Buscar projetos, topicos..."
          className="w-64 rounded-full bg-zinc-100 py-2 pl-8 pr-4 text-sm text-zinc-500 outline-none transition placeholder:text-zinc-400 focus:bg-zinc-200"
        />
      </div>

      <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900">
        Entrar
      </Link>
      <Link href="/cadastro" className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90" style={{ backgroundColor: '#0B7A3B' }}>
        Criar conta
      </Link>
    </header>
  )
}

function WelcomeCard({ studentsCount, projectsCount }: { studentsCount: number; projectsCount: number }) {
  return (
    <div className="rounded-2xl border border-zinc-100 px-10 py-8" style={{ background: 'linear-gradient(120deg, #f0fdf4 0%, #ffffff 55%, #fdf2f8 100%)' }}>
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-zinc-900">Bem-vindo(a) ao ADS Comunica!</h1>
      <p className="mb-8 max-w-xl text-base text-zinc-500">
        Veja projetos, acompanhe discussoes e conheca as oportunidades da comunidade de ADS.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/cadastro" className="flex items-center gap-2 rounded-lg px-6 py-3 text-base font-semibold text-white shadow-sm transition" style={{ backgroundColor: '#0B7A3B' }}>
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          Novo Projeto
        </Link>
        <Link href="/login" className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-6 py-3 text-base font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50">
          <IconMessage size={16} />
          Criar Topico
        </Link>
      </div>
      <div className="mt-8 flex gap-8 border-t border-white/70 pt-5">
        <Stat label="Alunos" value={studentsCount} />
        <Stat label="Projetos" value={projectsCount} />
      </div>
    </div>
  )
}

function ProjectsSection({ projects }: { projects: Project[] }) {
  return (
    <section>
      <SectionHeader title="Projetos em destaque" icon={<ProjectsIcon />} href="/projetos" action="Ver todos" />
      {projects.length === 0 ? (
        <EmptyCard text="Nenhum projeto cadastrado ainda." action="Criar o primeiro projeto" href="/cadastro" />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {projects.map((project) => {
            const tags = project.project_tags as { tag_name: string }[]
            const author = firstRelation(project.users)
            return (
              <Link key={project.id} href={`/projetos/${project.id}`} className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-7 transition-shadow hover:shadow-md">
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-lg font-bold leading-snug text-zinc-900">{project.title}</h3>
                  {author && (
                    <p className="text-sm text-zinc-400">
                      Por {author.name} &bull; Atualizado {relativeTime(project.updated_at)}
                    </p>
                  )}
                </div>
                <p className="line-clamp-4 flex-1 text-sm leading-relaxed text-zinc-500">{project.description}</p>
                {tags.length > 0 && (
                  <div className="mt-auto flex flex-wrap gap-2">
                    {tags.slice(0, 3).map((tag) => (
                      <span key={tag.tag_name} className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-600">
                        {tag.tag_name}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}

function TopicsSection({ topics }: { topics: Topic[] }) {
  return (
    <section>
      <SectionHeader title="Discussoes Recentes" icon={<TopicsIcon />} href="/login" action="Participar" />
      {topics.length === 0 ? (
        <EmptyCard text="Nenhum topico no forum ainda." action="Criar topico" href="/login" />
      ) : (
        <div className="flex flex-col gap-3">
          {topics.map((topic) => {
            const author = firstRelation(topic.users)
            const category = firstRelation(topic.forum_categories)
            return (
              <Link key={topic.id} href="/login" className="flex items-start justify-between gap-4 rounded-2xl border border-zinc-200 bg-white px-6 py-5 transition hover:border-zinc-300">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <p className="truncate text-base font-semibold text-zinc-900">{topic.title}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {category && <span className="rounded bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">{category.name}</span>}
                    <span className="text-sm text-zinc-400">Criado por {author?.name ?? 'Aluno'} &bull; {formatDate(topic.created_at)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 pt-0.5 text-sm text-zinc-400">
                  <ReplyIcon />
                  {topic.replies_count ?? 0}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}

function VisitorCard() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h3 className="mb-4 text-base font-semibold text-zinc-900">Seu Perfil</h3>
      <div className="mb-5 flex items-center gap-4">
        <div className="relative h-14 w-14 shrink-0">
          <svg viewBox="0 0 56 56" className="h-full w-full -rotate-90">
            <circle cx={28} cy={28} r={22} fill="none" stroke="#f0fdf4" strokeWidth={6} />
            <circle cx={28} cy={28} r={22} fill="none" stroke="#16a34a" strokeWidth={6} strokeDasharray={`${2 * Math.PI * 22}`} strokeDashoffset={`${2 * Math.PI * 22 * 0.7}`} strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-green-700">30%</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-900">Visitante</p>
          <p className="mt-0.5 text-xs text-zinc-400">Entre para publicar e comentar</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4">
        <Link href="/login" className="rounded-lg border border-zinc-200 px-3 py-2 text-center text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50">Entrar</Link>
        <Link href="/cadastro" className="rounded-lg px-3 py-2 text-center text-xs font-semibold text-white transition hover:opacity-90" style={{ backgroundColor: '#0B7A3B' }}>Criar conta</Link>
      </div>
    </div>
  )
}

function TopContributorsCard({ contributors }: { contributors: Contributor[] }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-zinc-900">
        <MedalIcon />
        Top Contribuidores
      </h3>
      <div className="flex flex-col gap-3">
        {contributors.map((contributor, i) => (
          <div key={contributor.id} className="flex items-center gap-3">
            <span className="w-4 shrink-0 text-xs font-bold text-zinc-300">{i + 1}</span>
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-zinc-200">
              {contributor.avatar_url ? (
                <Image src={contributor.avatar_url} alt={contributor.name} width={32} height={32} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-zinc-500">{contributor.name.charAt(0).toUpperCase()}</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-zinc-900">{contributor.name}</p>
              <p className="text-xs text-zinc-400">{contributor.semester ? `${contributor.semester}o Semestre` : 'Aluno'}</p>
            </div>
            <span className="shrink-0 text-xs font-bold" style={{ color: '#0B7A3B' }}>{contributor.totalLikes > 0 ? `${contributor.totalLikes} XP` : '-'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TagsCard({ tags }: { tags: string[] }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h3 className="mb-3 text-base font-semibold text-zinc-900">Tags Populares</h3>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Link key={tag} href={`/projetos?tag=${encodeURIComponent(tag)}`} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-200">
            #{tag}
          </Link>
        ))}
      </div>
    </div>
  )
}

function CalendarCard() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const today = now.getDate()
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h3 className="mb-4 text-base font-semibold text-zinc-900">Calendario de eventos</h3>
      <p className="mb-3 text-base font-bold text-zinc-900">{MONTH_NAMES[month]}</p>
      <div className="mb-1 grid grid-cols-7">
        {DAY_LABELS.map((day, i) => <div key={i} className="pb-1 text-center text-[11px] font-medium text-zinc-400">{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => (
          <div key={i} className="flex h-7 items-center justify-center">
            {day !== null && (
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${day === today ? 'font-bold text-white' : 'text-zinc-700'}`} style={day === today ? { backgroundColor: '#0B7A3B' } : undefined}>
                {day}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-zinc-100 pt-3">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-400" />
        <span className="text-xs text-zinc-600">Hackathon 2026</span>
      </div>
    </div>
  )
}

function QuickCreateMenu() {
  const quickCreateItems = [
    { href: '/cadastro', label: 'Novo projeto' },
    { href: '/cadastro', label: 'Novo artigo' },
    { href: '/login', label: 'Novo topico' },
  ]

  return (
    <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-3">
      <div className="w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
        {quickCreateItems.map((item) => (
          <Link key={item.label} href={item.href} className="block border-b border-zinc-100 px-4 py-3 text-sm font-medium text-zinc-700 transition last:border-b-0 hover:bg-zinc-50 hover:text-zinc-900">
            {item.label}
          </Link>
        ))}
      </div>
      <Link href="/cadastro" aria-label="Criar conta para publicar" className="grid h-14 w-14 place-items-center rounded-full text-white shadow-lg transition hover:scale-105" style={{ backgroundColor: '#0B7A3B' }}>
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      </Link>
    </div>
  )
}

function SectionHeader({ title, icon, href, action }: { title: string; icon: React.ReactNode; href: string; action: string }) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">{icon}{title}</h2>
      <Link href={href} className="flex items-center gap-1 text-sm font-medium text-green-600 transition hover:text-green-700">
        {action}
        <ArrowIcon />
      </Link>
    </div>
  )
}

function EmptyCard({ text, action, href }: { text: string; action: string; href: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-200 p-10 text-center">
      <p className="text-sm text-zinc-400">{text}</p>
      <Link href={href} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-green-600 hover:underline">
        {action}
        <ArrowIcon />
      </Link>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-bold text-zinc-900">{value.toLocaleString('pt-BR')}</p>
      <p className="text-xs text-zinc-400">{label}</p>
    </div>
  )
}

function getTopContributors(projects: { like_count: number | null; users: unknown }[]): Contributor[] {
  const likesMap = new Map<string, Contributor>()
  for (const project of projects) {
    const user = firstRelation(project.users) as Contributor | null
    if (!user?.id) continue
    const prev = likesMap.get(user.id)
    likesMap.set(user.id, {
      id: user.id,
      name: user.name,
      avatar_url: user.avatar_url,
      semester: user.semester,
      totalLikes: (prev?.totalLikes ?? 0) + (project.like_count ?? 0),
    })
  }
  return Array.from(likesMap.values()).sort((a, b) => b.totalLikes - a.totalLikes).slice(0, 3)
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const DAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const h = Math.floor(ms / 36e5)
  if (h < 1) return 'ha menos de 1h'
  if (h < 24) return `ha ${h}h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'ha 1 dia' : `ha ${d} dias`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
}

function slugify(value: string) {
  return value.toLowerCase().replace(/\s+/g, '-')
}

function ArrowIcon() {
  return <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
}

function ProjectsIcon() {
  return <IconGrid size={16} color="#16a34a" />
}

function TopicsIcon() {
  return <IconMessage size={16} color="#dc2626" />
}

function ReplyIcon() {
  return <IconMessage size={14} />
}

function MedalIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={12} cy={8} r={6} />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  )
}

function IconHome({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
}

function IconBook({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
}

function IconGrid({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x={3} y={3} width={7} height={7} /><rect x={14} y={3} width={7} height={7} /><rect x={14} y={14} width={7} height={7} /><rect x={3} y={14} width={7} height={7} /></svg>
}

function IconCalendar({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x={3} y={4} width={18} height={18} rx={2} ry={2} /><line x1={16} y1={2} x2={16} y2={6} /><line x1={8} y1={2} x2={8} y2={6} /><line x1={3} y1={10} x2={21} y2={10} /></svg>
}

function IconBriefcase({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x={2} y={7} width={20} height={14} rx={2} ry={2} /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
}

function IconUsers({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx={9} cy={7} r={4} /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
}

function IconPerson({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx={12} cy={7} r={4} /></svg>
}

function IconMessage({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
}

function IconCalendarGrid({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x={3} y={4} width={18} height={18} rx={2} ry={2} /><line x1={16} y1={2} x2={16} y2={6} /><line x1={8} y1={2} x2={8} y2={6} /><line x1={3} y1={10} x2={21} y2={10} /><line x1={8} y1={14} x2={8} y2={14} /><line x1={12} y1={14} x2={12} y2={14} /><line x1={16} y1={14} x2={16} y2={14} /><line x1={8} y1={18} x2={8} y2={18} /><line x1={12} y1={18} x2={12} y2={18} /></svg>
}
