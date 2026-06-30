import Image from 'next/image'
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
  preferred_area: string | null
  selected_mascot_id: string | null
  xp: number
}

type Level = {
  id: number
  name: string
  min_xp: number
}

type Mascot = {
  id: string
  name: string
  description: string | null
  image_url: string
}

const AREAS = [
  { value: 'front-end', label: 'Front-end' },
  { value: 'back-end', label: 'Back-end' },
  { value: 'full-stack', label: 'Full-stack' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'dados', label: 'Dados & IA' },
  { value: 'devops', label: 'DevOps & Cloud' },
  { value: 'ux-design', label: 'UX & Design' },
  { value: 'seguranca', label: 'Segurança' },
]

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

function SocialIcon({ label }: { label: string }) {
  if (label === 'GitHub') return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
    </svg>
  )
  if (label === 'LinkedIn') return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function getProjectCover(images: unknown) {
  const media = (images as { image_url: string; display_order: number; media_type?: string | null }[] | null) ?? []
  return [...media].sort((a, b) => a.display_order - b.display_order)[0] ?? null
}

function currentLevel(levels: Level[], xp: number) {
  return [...levels].reverse().find((level) => xp >= level.min_xp) ?? levels[0] ?? null
}

function splitPreferredAreas(value?: string | null) {
  return value?.split(',').map((item) => item.trim()).filter(Boolean) ?? []
}

function formatProfileArea(value: string) {
  const knownArea = AREAS.find((area) => area.value === value)
  if (knownArea) return knownArea.label

  return value
    .split(/([\s/-]+)/)
    .map((part) => (/^[\s/-]+$/.test(part) ? part : part.charAt(0).toLocaleUpperCase('pt-BR') + part.slice(1)))
    .join('')
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="text-lg font-bold text-zinc-900">{value}</p>
      <p className="text-xs text-zinc-400">{label}</p>
    </div>
  )
}

function TagPanel({ title, items, variant = 'neutral' }: { title: string; items: string[]; variant?: 'neutral' | 'green' }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold text-zinc-900">{title}</h2>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              variant === 'green'
                ? 'bg-green-50 text-[#2F9E41]'
                : 'bg-zinc-100 text-zinc-600'
            }`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
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
    { data: projects },
    { data: articles },
    { data: topics },
    { data: levels },
    { data: linkedProfessor },
  ] = await Promise.all([
    supabase
      .from('users')
      .select('id, name, bio, semester, github_url, linkedin_url, portfolio_url, avatar_url, role, preferred_area, selected_mascot_id, xp')
      .eq('id', id)
      .single(),
    supabase.from('user_skills').select('skill_name').eq('user_id', id).order('skill_name'),
    supabase.from('egressos').select('graduation_year, role, company').eq('user_id', id).eq('is_active', true).maybeSingle(),
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', id).eq('approved', true).eq('is_active', true),
    supabase.from('articles').select('id', { count: 'exact', head: true }).eq('user_id', id).eq('status', 'publicado'),
    supabase.from('forum_topics').select('id', { count: 'exact', head: true }).eq('user_id', id),
    supabase.from('projects').select('id, title, description, is_featured, created_at, like_count, project_images(image_url, display_order, media_type)').eq('user_id', id).eq('approved', true).eq('is_active', true),
    supabase.from('articles').select('id, title, summary, cover_image_url, published_at, like_count').eq('user_id', id).eq('status', 'publicado'),
    supabase.from('forum_topics').select('id, title, created_at, replies_count').eq('user_id', id),
    supabase.from('levels').select('id, name, min_xp').order('min_xp', { ascending: true }),
    supabase.from('professors').select('avatar_url, bio').eq('user_id', id).maybeSingle(),
  ])

  if (!profile) notFound()

  const user = profile as Profile
  const { data: selectedMascot } = user.selected_mascot_id
    ? await supabase
        .from('mascots')
        .select('id, name, description, image_url')
        .eq('id', user.selected_mascot_id)
        .eq('is_active', true)
        .maybeSingle()
    : { data: null }
  const mascot = selectedMascot as Mascot | null
  const displayAvatarUrl = linkedProfessor?.avatar_url ?? user.avatar_url
  const displayBio = linkedProfessor?.bio ?? user.bio
  const skillNames = (skills ?? []).map((skill) => skill.skill_name)
  const preferredAreas = splitPreferredAreas(user.preferred_area)
  const xp = user.xp ?? 0
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
    <div className="w-full px-4 py-8 md:px-6">
      <Link href="/" className="mb-8 inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-400 transition hover:text-zinc-700">
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
        Voltar
      </Link>

      <section className="grid gap-3 lg:grid-cols-[1.08fr_1fr_1.35fr]">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <UserAvatar src={displayAvatarUrl} name={user.name} className="h-20 w-20 shrink-0" sizes="80px" />
            <div className="min-w-0">
              <span className="mb-2 inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-500">
                {egresso ? 'Ex-aluno' : roleLabel(user.role)}
              </span>
              <h1 className="text-xl font-bold leading-tight text-zinc-900">{user.name}</h1>
              {user.semester && user.role !== 'professor' && (
                <p className="mt-1 text-sm text-zinc-400">{user.semester}{String.fromCharCode(186)} semestre</p>
              )}
              {egresso && (
                <p className="mt-1 text-sm text-zinc-400">
                  {egresso.graduation_year ? `Turma ${egresso.graduation_year}` : 'Ex-aluno'}
                  {egresso.role ? ` - ${egresso.role}` : ''}
                  {egresso.company ? ` @ ${egresso.company}` : ''}
                </p>
              )}
            </div>
          </div>

          {displayBio && (
            <p className="mt-5 border-t border-zinc-100 pt-4 text-sm leading-relaxed text-zinc-600 whitespace-pre-wrap">{displayBio}</p>
          )}

          <div className="mt-4 grid grid-cols-4 gap-2 border-t border-zinc-100 pt-3">
            <div>
              <p className="text-lg font-bold text-zinc-900">{xp.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-zinc-400">XP</p>
              {level && <p className="mt-1 text-xs font-semibold text-[#2F9E41]">{level.name}</p>}
            </div>
            <Metric value={projectsCount ?? 0} label="Projetos" />
            <Metric value={articlesCount ?? 0} label="Artigos" />
            <Metric value={topicsCount ?? 0} label="Tópicos" />
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">Links</h2>
          {socials.length > 0 ? (
            <div className="flex flex-col gap-2">
              {socials.map((social) => (
                <a
                  key={social.url}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2.5 text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50"
                >
                  <span className="shrink-0"><SocialIcon label={social.label} /></span>
                  <span className="shrink-0 text-sm font-semibold text-zinc-800">{social.label}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-zinc-400">{externalLabel(social.url)}</span>
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-zinc-400"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">Nenhum link público cadastrado.</p>
          )}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">Personagem escolhido</h2>
          {mascot ? (
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 shrink-0">
                <Image src={mascot.image_url} alt={mascot.name} fill className="object-contain drop-shadow-sm" sizes="64px" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-zinc-900">{mascot.name}</p>
                {mascot.description && (
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-zinc-500">{mascot.description}</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-400">Nenhum personagem escolhido.</p>
          )}
        </div>
      </section>

      {(preferredAreas.length > 0 || skillNames.length > 0) && (
        <section className="mt-3 grid gap-3 lg:grid-cols-2">
          {preferredAreas.length > 0 && (
            <TagPanel title="Áreas de interesse" items={preferredAreas.map(formatProfileArea)} variant="green" />
          )}
          {skillNames.length > 0 && (
            <TagPanel title="Habilidades" items={skillNames.map(formatProfileArea)} />
          )}
        </section>
      )}

      <ProfileActivityFeed items={feedItems} />
    </div>
  )
}
