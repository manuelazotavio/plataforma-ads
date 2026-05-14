import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import ProjectFilters from '@/app/components/ProjectFilters'
import UserAvatar from '@/app/components/UserAvatar'

export const dynamic = 'force-dynamic'
import { DEFAULT_PROJECT_TAGS, PROJECT_TAG_OPTIONS_TABLE, uniqueTagNames } from '@/app/lib/projectTags'

const CATEGORIES = [
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'maratona', label: 'Maratona' },
  { value: 'extensao', label: 'Extensão' },
  { value: 'iniciacao_cientifica', label: 'Iniciação Científica' },
]

export default async function ProjetosPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string | string[]; semester?: string; aluno?: string; category?: string }>
}) {
  const { tag, semester, aluno, category } = await searchParams
  const selectedTags = Array.isArray(tag) ? tag : tag ? [tag] : []

 
  let tagProjectIds: string[] | null = null
  if (selectedTags.length > 0) {
    const { data } = await supabase
      .from('project_tags')
      .select('project_id')
      .in('tag_name', selectedTags)
    tagProjectIds = data?.map((r) => r.project_id) ?? []
  }

  
  let query = supabase
    .from('projects')
    .select('id, title, description, repo_url, deploy_url, semester, is_featured, like_count, created_at, users(id, name, avatar_url), project_tags(tag_name), project_images(image_url, display_order, media_type)')
    .eq('approved', true)
    .order('created_at', { ascending: false })

  if (tagProjectIds !== null) {
    query = tagProjectIds.length > 0
      ? query.in('id', tagProjectIds)
      : query.in('id', ['00000000-0000-0000-0000-000000000000'])
  }
  if (semester) query = query.eq('semester', parseInt(semester))
  if (aluno) query = query.eq('user_id', aluno)
  if (category) query = query.eq('category', category)

  const [
    { data: projects },
    { data: tagRows },
    { data: configuredTagRows, error: configuredTagError },
    { data: semesterRows },
    { data: studentRows },
  ] =
    await Promise.all([
      query,
      supabase.from('project_tags').select('tag_name'),
      supabase.from(PROJECT_TAG_OPTIONS_TABLE).select('name').eq('is_active', true).order('display_order'),
      supabase.from('projects').select('semester').not('semester', 'is', null),
      supabase.from('projects').select('user_id, users(id, name)').not('user_id', 'is', null),
    ])

  const configuredTags = configuredTagError ? [] : uniqueTagNames((configuredTagRows ?? []).map((r) => r.name))
  const usedTags = uniqueTagNames((tagRows ?? []).map((r) => r.tag_name)).sort()
  const allTags = configuredTags.length > 0 ? configuredTags : usedTags.length > 0 ? usedTags : DEFAULT_PROJECT_TAGS
  const allSemesters = [...new Set((semesterRows ?? []).map((r) => r.semester as number))].sort((a, b) => a - b)

  type StudentRow = { user_id: string; users: { id: string; name: string } | null }
  const seenIds = new Set<string>()
  const allStudents = (studentRows as unknown as StudentRow[] ?? [])
    .filter((r) => r.users && !seenIds.has(r.user_id) && seenIds.add(r.user_id))
    .map((r) => ({ id: r.users!.id, name: r.users!.name }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="min-h-screen bg-white px-6 py-12 md:px-10 lg:px-12">
      <div className="w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Projetos</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {projects?.length ?? 0} projeto{(projects?.length ?? 0) !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href="/meus-projetos"
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
          >
            Meus projetos
          </Link>
        </div>

        
        <div className="no-scrollbar mb-6 flex max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-2 -mx-6 px-6 sm:flex-wrap sm:overflow-visible md:mx-0 md:px-0">
          <Link
            href="/projetos"
            className={`shrink-0 whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-semibold transition-colors cursor-pointer ${
              !category ? 'text-white' : 'text-zinc-400 hover:text-zinc-700'
            }`}
            style={!category ? { backgroundColor: '#2F9E41' } : undefined}
          >
            Todos
          </Link>
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.value}
              href={`/projetos?category=${cat.value}`}
              className={`shrink-0 whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-semibold transition-colors cursor-pointer ${
                category === cat.value ? 'text-white' : 'text-zinc-400 hover:text-zinc-700'
              }`}
              style={category === cat.value ? { backgroundColor: '#2F9E41' } : undefined}
            >
              {cat.label}
            </Link>
          ))}
        </div>

        <ProjectFilters tags={allTags} semesters={allSemesters} students={allStudents} />

        {!projects || projects.length === 0 ? (
          <div className="text-center py-20 text-zinc-400">
            <p className="text-lg">Nenhum projeto encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {projects.map((project) => {
              const cover = (project.project_images as { image_url: string; display_order: number; media_type?: string | null }[])
                .sort((a, b) => a.display_order - b.display_order)[0]
              const tags = project.project_tags as { tag_name: string }[]
              const author = project.users as unknown as { id: string; name: string; avatar_url: string | null } | null

              return (
                <div
                  key={project.id}
                  className="bg-white rounded-2xl border border-zinc-200 overflow-hidden flex flex-col hover:border-zinc-300 hover:shadow-sm transition"
                >
                  <Link href={`/projetos/${project.id}`} className="relative h-44 bg-zinc-100">
                    {cover
                      ? isVideoMedia(cover)
                        ? <video src={cover.image_url} className="h-full w-full object-cover" autoPlay muted loop playsInline />
                        : <Image src={cover.image_url} alt={project.title} fill className="object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-zinc-300 text-3xl">◻</div>
                    }
                    {project.is_featured && (
                      <span className="absolute top-2 left-2 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-semibold text-amber-900">
                        destaque
                      </span>
                    )}
                  </Link>

                  <div className="p-4 flex flex-col gap-2 flex-1">
                    <Link href={`/projetos/${project.id}`} className="text-sm font-semibold text-zinc-900 hover:text-[#2F9E41] transition">{project.title}</Link>
                    <Link href={`/projetos/${project.id}`} className="text-xs text-zinc-500 line-clamp-2 flex-1 hover:text-zinc-700 transition">{project.description}</Link>

                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {tags.map(({ tag_name }) => (
                          <span key={tag_name} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                            {tag_name}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-1">
                      <Link href={author ? `/usuarios/${author.id}` : '#'} className="flex items-center gap-2 hover:opacity-80 transition">
                        {author?.avatar_url
                          ? <Image src={author.avatar_url} alt={author.name} width={16} height={16} className="w-4 h-4 rounded-full object-cover shrink-0" />
                          : <UserAvatar name={author?.name} className="h-4 w-4" sizes="16px" />
                        }
                        <span className="text-xs text-zinc-400">{author?.name}</span>
                      </Link>
                      {(project.like_count as number) > 0 && (
                        <span className="flex items-center gap-1 text-xs text-zinc-400">
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>
                          {project.like_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function isVideoMedia(media: { image_url: string; media_type?: string | null }) {
  if (media.media_type === 'video') return true
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(media.image_url)
}
