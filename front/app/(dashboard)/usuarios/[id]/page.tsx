import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import ProfileActivityFeed, { type ProfileActivityItem } from '@/app/components/ProfileActivityFeed'
import UserAvatar from '@/app/components/UserAvatar'

export const dynamic = 'force-dynamic'

type Profile = {
  id: string
  name: string
  bio: string | null
  semester: number | null
  github_url: string | null
  linkedin_url: string | null
  portfolio_url: string | null
  avatar_url: string | null
  role: string | null
}

type Level = {
  id: number
  name: string
  min_xp: number
}

function roleLabel(role: string | null) {
  if (role === 'admin') return 'Admin'
  if (role === 'moderador') return 'Moderador'
  if (role === 'professor') return 'Professor'
  return 'Aluno'
}

function externalLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function getProjectCover(images: unknown) {
  const media = (images as { image_url: string; display_order: number; media_type?: string | null }[] | null) ?? []
  return [...media].sort((a, b) => a.display_order - b.display_order)[0] ?? null
}

function currentLevel(levels: Level[], xp: number) {
  return [...levels].reverse().find((level) => xp >= level.min_xp) ?? levels[0] ?? null
}

export default async function PublicUserProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [
    { data: profile },
    { data: skills },
    { data: egresso },
    { count: projectsCount },
    { count: articlesCount },
    { count: topicsCount },
    { count: xpProjectsCount },
    { count: xpArticlesCount },
    { count: xpTopicsCount },
    { count: projectCommentsCount },
    { count: articleCommentsCount },
    { data: xpProjects },
    { data: xpArticles },
    { data: projects },
    { data: articles },
    { data: topics },
    { data: levels },
  ] = await Promise.all([
    supabase
      .from('users')
      .select('id, name, bio, semester, github_url, linkedin_url, portfolio_url, avatar_url, role')
      .eq('id', id)
      .single(),
    supabase.from('user_skills').select('skill_name').eq('user_id', id).order('skill_name'),
    supabase.from('egressos').select('graduation_year, role, company').eq('user_id', id).eq('is_active', true).maybeSingle(),
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', id).eq('approved', true),
    supabase.from('articles').select('id', { count: 'exact', head: true }).eq('user_id', id).eq('status', 'publicado'),
    supabase.from('forum_topics').select('id', { count: 'exact', head: true }).eq('user_id', id),
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', id),
    supabase.from('articles').select('id', { count: 'exact', head: true }).eq('user_id', id).eq('status', 'publicado'),
    supabase.from('forum_topics').select('id', { count: 'exact', head: true }).eq('user_id', id),
    supabase.from('project_comments').select('id', { count: 'exact', head: true }).eq('user_id', id),
    supabase.from('article_comments').select('id', { count: 'exact', head: true }).eq('user_id', id),
    supabase.from('projects').select('like_count').eq('user_id', id),
    supabase.from('articles').select('like_count').eq('user_id', id),
    supabase.from('projects').select('id, title, description, is_featured, created_at, like_count, project_images(image_url, display_order, media_type)').eq('user_id', id).eq('approved', true),
    supabase.from('articles').select('id, title, summary, cover_image_url, published_at, like_count').eq('user_id', id).eq('status', 'publicado'),
    supabase.from('forum_topics').select('id, title, created_at, replies_count').eq('user_id', id),
    supabase.from('levels').select('id, name, min_xp').order('min_xp', { ascending: true }),
  ])

  if (!profile) notFound()

  const user = profile as Profile
  const skillNames = (skills ?? []).map((skill) => skill.skill_name)
  const likesReceived =
    (xpProjects ?? []).reduce((total, project) => total + (project.like_count ?? 0), 0) +
    (xpArticles ?? []).reduce((total, article) => total + (article.like_count ?? 0), 0)
  const commentsCount = (projectCommentsCount ?? 0) + (articleCommentsCount ?? 0)
  const xp =
    (xpProjectsCount ?? 0) * 50 +
    (xpArticlesCount ?? 0) * 40 +
    (xpTopicsCount ?? 0) * 20 +
    commentsCount * 10 +
    likesReceived * 5
  const level = currentLevel((levels ?? []) as Level[], xp)
  const socials = [
    user.github_url ? { label: 'GitHub', url: user.github_url } : null,
    user.linkedin_url ? { label: 'LinkedIn', url: user.linkedin_url } : null,
    user.portfolio_url ? { label: 'Portfólio', url: user.portfolio_url } : null,
  ].filter(Boolean) as { label: string; url: string }[]
  const feedItems: ProfileActivityItem[] = [
    ...(projects ?? []).map((project) => ({
      id: project.id,
      type: 'project' as const,
      title: project.title,
      description: project.description,
      href: `/projetos/${project.id}`,
      date: project.created_at,
      isPinned: project.is_featured,
      meta: `${project.like_count ?? 0} curtidas`,
      imageUrl: getProjectCover(project.project_images)?.image_url ?? null,
      imageType: getProjectCover(project.project_images)?.media_type ?? null,
    })),
    ...(articles ?? [])
      .map((article) => ({
        id: article.id,
        type: 'article' as const,
        title: article.title,
        description: article.summary,
        href: `/artigos/${article.id}`,
        date: article.published_at ?? '',
        meta: `${article.like_count ?? 0} curtidas`,
        imageUrl: article.cover_image_url,
      }))
      .filter((item) => item.date),
    ...(topics ?? []).map((topic) => ({
      id: topic.id,
      type: 'topic' as const,
      title: topic.title,
      description: null,
      href: `/forum/${topic.id}`,
      date: topic.created_at,
      meta: `${topic.replies_count ?? 0} respostas`,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="px-4 md:px-6 py-8 w-full">
      <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-700 transition mb-8 inline-flex items-center gap-1.5">
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
        Voltar
      </Link>

      <section className="border-b border-zinc-100 pb-8">
        <div className="flex items-start gap-5">
          <UserAvatar src={user.avatar_url} name={user.name} className="h-20 w-20" sizes="80px" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-zinc-900">{user.name}</h1>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-500">
                {egresso ? 'Egresso' : roleLabel(user.role)}
              </span>
            </div>
            {user.semester && (
              <p className="mt-1 text-sm text-zinc-400">{user.semester}{String.fromCharCode(186)} semestre</p>
            )}
            {egresso && (
              <p className="mt-1 text-sm text-zinc-400">
                Egresso{egresso.graduation_year ? ` ${egresso.graduation_year}` : ''}
                {egresso.role ? ` - ${egresso.role}` : ''}
                {egresso.company ? ` @ ${egresso.company}` : ''}
              </p>
            )}
            {user.bio && (
              <p className="mt-4 text-sm leading-relaxed text-zinc-600 whitespace-pre-wrap">{user.bio}</p>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 py-6 border-b border-zinc-100 sm:grid-cols-4">
        <div>
          <p className="text-xl font-bold text-zinc-900">{xp.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-zinc-400">XP</p>
          {level && <p className="mt-1 text-xs font-semibold text-[#2F9E41]">{level.name}</p>}
        </div>
        <div>
          <p className="text-xl font-bold text-zinc-900">{projectsCount ?? 0}</p>
          <p className="text-xs text-zinc-400">Projetos</p>
        </div>
        <div>
          <p className="text-xl font-bold text-zinc-900">{articlesCount ?? 0}</p>
          <p className="text-xs text-zinc-400">Artigos</p>
        </div>
        <div>
          <p className="text-xl font-bold text-zinc-900">{topicsCount ?? 0}</p>
          <p className="text-xs text-zinc-400">Tópicos</p>
        </div>
      </section>

      {(skillNames.length > 0 || socials.length > 0) && (
        <section className="py-6 flex flex-col gap-6">
          {skillNames.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 mb-3">Habilidades</h2>
              <div className="flex flex-wrap gap-2">
                {skillNames.map((skill) => (
                  <span key={skill} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {socials.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 mb-3">Links</h2>
              <div className="flex flex-col gap-2">
                {socials.map((social) => (
                  <a
                    key={social.url}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50 transition"
                  >
                    <span className="font-medium text-zinc-800">{social.label}</span>
                    <span className="text-xs text-zinc-400">{externalLabel(social.url)}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <ProfileActivityFeed items={feedItems} />
    </div>
  )
}
