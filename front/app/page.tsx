export const dynamic = 'force-dynamic'

import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import HomeShell from '@/app/components/HomeShell'
import { PublicProfileCard, PublicWelcomeCard } from '@/app/components/PublicAuthControls'
import HomeCalendarCard from '@/app/components/HomeCalendarCard'
import UserAvatar from '@/app/components/UserAvatar'

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
  role: string | null
  xp: number
}

type PopularTag = {
  name: string
  count: number
}

type ContributorUser = {
  id: string
  name: string
  avatar_url: string | null
  semester: number | null
  role: string | null
}

type XpContent = {
  user_id: string | null
  like_count?: number | null
}

export default async function HomePage() {
  const [
    { data: projects },
    { data: topics },
    { data: tags },
    { data: contributorUsers },
    { data: contributorProjects },
    { data: contributorArticles },
    { data: contributorTopics },
    { data: contributorProjectComments },
    { data: contributorArticleComments },
    { data: events },
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
    supabase.from('project_tags').select('tag_name, projects!inner(approved)').eq('projects.approved', true),
    supabase
      .from('users')
      .select('id, name, avatar_url, semester, role'),
    supabase.from('projects').select('user_id, like_count'),
    supabase.from('articles').select('user_id, like_count').eq('status', 'publicado'),
    supabase.from('forum_topics').select('user_id'),
    supabase.from('project_comments').select('user_id'),
    supabase.from('article_comments').select('user_id'),
    supabase
      .from('events')
      .select('id, title, category, start_date, end_date')
      .eq('is_active', true)
      .order('start_date', { ascending: true }),
  ])

  const featuredProjects = (projects ?? []) as unknown as Project[]
  const recentTopics = (topics ?? []) as unknown as Topic[]
  const popularTags = getPopularTags((tags ?? []).map((tag) => tag.tag_name))
  const topContributors = getTopContributors({
    users: (contributorUsers ?? []) as ContributorUser[],
    projects: (contributorProjects ?? []) as XpContent[],
    articles: (contributorArticles ?? []) as XpContent[],
    topics: (contributorTopics ?? []) as XpContent[],
    projectComments: (contributorProjectComments ?? []) as XpContent[],
    articleComments: (contributorArticleComments ?? []) as XpContent[],
  })
  const allEvents = (events ?? []) as { id: string; title: string; category: string | null; start_date: string | null; end_date: string | null }[]

  return (
    <HomeShell>
      <div className="grid grid-cols-1 gap-7 px-5 py-6 lg:px-8 xl:grid-cols-[minmax(0,750px)_290px_300px]">
        <div className="flex min-w-0 flex-col gap-7">
          <PublicWelcomeCard />
          <ProjectsSection projects={featuredProjects} />
          <TopicsSection topics={recentTopics} />
        </div>

        <div className="flex flex-col gap-4">
          <PublicProfileCard />
          {topContributors.length > 0 && <TopContributorsCard contributors={topContributors} />}
          {popularTags.length > 0 && <TagsCard tags={popularTags} />}
        </div>

        <div className="flex flex-col gap-4">
          <HomeCalendarCard events={allEvents} />
        </div>
      </div>

      <footer className="mt-8 border-t border-zinc-100 px-4 py-6 md:pl-10 md:pr-28">
        <div className="flex flex-col items-center gap-y-2 text-center text-xs text-zinc-400 md:flex-row md:flex-wrap md:text-left md:gap-x-5">
          <Link href="/regras" className="transition hover:text-zinc-700">Regras do ADS Comunica</Link>
          <Link href="/privacidade" className="transition hover:text-zinc-700">Política de Privacidade</Link>
          <Link href="/contrato" className="transition hover:text-zinc-700">Contrato de Usuário</Link>
          <Link href="/acessibilidade" className="transition hover:text-zinc-700">Acessibilidade</Link>
          <span className="md:ml-auto">ADS Comunica, Inc. &copy; 2026. Todos os direitos reservados.</span>
        </div>
      </footer>
    </HomeShell>
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
      <SectionHeader title="Discussões recentes" icon={<TopicsIcon />} href="/forum" action="Participar" />
      {topics.length === 0 ? (
        <EmptyCard text="Nenhum tópico no fórum ainda." action="Criar tópico" href="/forum/novo" />
      ) : (
        <div className="flex flex-col gap-3">
          {topics.map((topic) => {
            const author = firstRelation(topic.users)
            const category = firstRelation(topic.forum_categories)
            return (
              <Link key={topic.id} href={`/forum/${topic.id}`} className="flex items-start justify-between gap-4 rounded-2xl border border-zinc-200 bg-white px-6 py-5 transition hover:border-zinc-300">
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

function TopContributorsCard({ contributors }: { contributors: Contributor[] }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-zinc-900">
        <MedalIcon />
        Top contribuidores
      </h3>
      <div className="flex flex-col gap-3">
        {contributors.map((contributor, i) => (
          <Link
            key={contributor.id}
            href={`/usuarios/${contributor.id}`}
            className="flex items-center gap-3 rounded-xl -mx-2 px-2 py-1.5 transition hover:bg-zinc-50"
          >
            <span className="w-4 shrink-0 text-xs font-bold text-zinc-300">{i + 1}</span>
            <UserAvatar src={contributor.avatar_url} name={contributor.name} className="h-8 w-8" sizes="32px" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-zinc-900">{contributor.name}</p>
              <p className="text-xs text-zinc-400">{contributorLabel(contributor)}</p>
            </div>
            <span className="shrink-0 text-xs font-bold" style={{ color: '#2F9E41' }}>{contributor.xp > 0 ? `${contributor.xp} XP` : '-'}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function TagsCard({ tags }: { tags: PopularTag[] }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-zinc-900">Tags populares</h3>
        <Link href="/projetos" className="text-xs font-medium text-green-600 hover:text-green-700 transition">Ver projetos</Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Link
            key={tag.name}
            href={`/projetos?tag=${encodeURIComponent(tag.name)}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-200 hover:text-zinc-900"
            title={`${tag.count} projeto${tag.count !== 1 ? 's' : ''} com ${tag.name}`}
          >
            <span>#{tag.name}</span>
            <span className="text-[10px] text-zinc-400">{tag.count}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function SectionHeader({ title, icon, href, action }: { title: string; icon: React.ReactNode; href: string; action: string }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-1.5 text-base md:text-lg font-semibold text-zinc-900 min-w-0">
        <span className="hidden sm:flex shrink-0">{icon}</span>
        <span className="truncate">{title}</span>
      </h2>
      <Link href={href} className="flex items-center gap-1 text-xs md:text-sm font-medium text-green-600 transition hover:text-green-700 shrink-0 whitespace-nowrap">
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

function getTopContributors({
  users,
  projects,
  articles,
  topics,
  projectComments,
  articleComments,
}: {
  users: ContributorUser[]
  projects: XpContent[]
  articles: XpContent[]
  topics: XpContent[]
  projectComments: XpContent[]
  articleComments: XpContent[]
}): Contributor[] {
  const usersById = new Map(users.map((user) => [user.id, user]))
  const xpByUser = new Map<string, number>()

  function addXp(userId: string | null | undefined, xp: number) {
    if (!userId || !usersById.has(userId)) return
    xpByUser.set(userId, (xpByUser.get(userId) ?? 0) + xp)
  }

  for (const project of projects) addXp(project.user_id, 50 + (project.like_count ?? 0) * 5)
  for (const article of articles) addXp(article.user_id, 40 + (article.like_count ?? 0) * 5)
  for (const topic of topics) addXp(topic.user_id, 20)
  for (const comment of projectComments) addXp(comment.user_id, 10)
  for (const comment of articleComments) addXp(comment.user_id, 10)

  return Array.from(xpByUser.entries())
    .map(([userId, xp]) => {
      const user = usersById.get(userId)!
      return {
        id: user.id,
        name: user.name,
        avatar_url: user.avatar_url,
        semester: user.semester,
        role: user.role,
        xp,
      }
    })
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 3)
}

function getPopularTags(tags: string[]): PopularTag[] {
  const counts = new Map<string, number>()
  for (const tag of tags) {
    const name = tag.trim()
    if (!name) continue
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 8)
}

function contributorLabel(contributor: Pick<Contributor, 'role' | 'semester'>) {
  if (contributor.role === 'admin') return 'Administrador'
  if (contributor.role === 'moderador') return 'Moderador'
  if (contributor.role === 'professor') return 'Professor'
  if (contributor.role === 'egresso') return 'Egresso'
  if (contributor.semester) return `${contributor.semester}º semestre`
  return 'Aluno'
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const h = Math.floor(ms / 36e5)
  if (h < 1) return 'há menos de 1h'
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'há 1 dia' : `há ${d} dias`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
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
