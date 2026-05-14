import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import LikeButton from '@/app/components/LikeButton'
import ProjectMediaMosaic from '@/app/components/ProjectMediaMosaic'
import ShareProjectButton from '@/app/components/ShareProjectButton'
import UserAvatar from '@/app/components/UserAvatar'

export const dynamic = 'force-dynamic'
import Comments from '@/app/components/Comments'

export default async function ProjetoDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: project } = await supabase
    .from('projects')
    .select('id, title, description, repo_url, deploy_url, semester, start_date, end_date, is_featured, like_count, created_at, users(id, name, avatar_url), project_tags(tag_name), project_images(image_url, display_order, media_type)')
    .eq('id', id)
    .single()

  if (!project) notFound()

  const images = (project.project_images as { image_url: string; display_order: number; media_type: string }[])
    .sort((a, b) => a.display_order - b.display_order)
  const tags = project.project_tags as { tag_name: string }[]
  const author = project.users as unknown as { id: string; name: string; avatar_url: string | null } | null
  const cover = images[0]
  const gallery = images.slice(1)

  const createdAt = new Date(project.created_at).toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  const projectPeriod = formatProjectPeriod(project.start_date, project.end_date)

  return (
    <div className="min-h-screen bg-white">

      {cover && images.length <= 2 && (
        <div className="relative w-full h-72 bg-zinc-900 overflow-hidden">
          {isVideoMedia(cover) ? (
            <video src={cover.image_url} className="w-full h-full object-cover opacity-80" autoPlay muted loop playsInline />
          ) : (
            <Image src={cover.image_url} alt={project.title} fill className="object-cover opacity-80" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>
      )}

      <div className="border-b border-zinc-100 px-6 py-5 sm:px-8 lg:px-12 xl:px-16">
        <Link href="/projetos" className="mb-5 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-zinc-700">
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          Todos os projetos
        </Link>
        <div className="mx-auto w-full max-w-6xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              {project.is_featured && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 mb-2">
                  <svg width={10} height={10} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  Destaque
                </span>
              )}
              <h1 className="text-2xl font-bold text-zinc-900">{project.title}</h1>
            </div>
            {author && (
              <div className="flex flex-col gap-3 sm:ml-auto sm:mr-12">
                <p className="text-sm font-semibold text-zinc-700">Autor</p>
                <Link href={`/usuarios/${author.id}`} className="flex items-center gap-3 transition hover:opacity-80">
                  <UserAvatar src={author.avatar_url} name={author.name} className="h-9 w-9" />
                  <span className="text-sm font-medium text-zinc-900">{author.name}</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8 sm:px-8 lg:px-12 xl:px-16">

        <div className="min-w-0">

          {project.description && (
            <div className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-zinc-900">Sobre o projeto</h2>
              <p className="whitespace-pre-wrap text-base leading-8 text-zinc-600">{project.description}</p>
            </div>
          )}

          {images.length === 1 && (
            <div className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-zinc-900">Galeria</h2>
              <ProjectMediaMosaic items={images} title={project.title} />
            </div>
          )}

          {images.length > 2 && (
            <div className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-zinc-900">Galeria</h2>
              <ProjectMediaMosaic items={images} title={project.title} />
            </div>
          )}

          {images.length <= 2 && gallery.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-zinc-900">Galeria</h2>
              <ProjectMediaMosaic items={gallery} title={project.title} />
            </div>
          )}

          <div className="mb-6 flex flex-col gap-3 border-t border-zinc-100 pt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-8">
            <div className="flex w-full sm:w-auto">
              <LikeButton
                type="project"
                targetId={project.id}
                initialCount={project.like_count}
                label="Curtir projeto"
                variant="action"
                className="w-full justify-center sm:w-auto"
              />
            </div>
            <ShareProjectButton title={project.title} className="w-full justify-center sm:w-auto" />
          </div>

          <div className="border-t border-zinc-100 pt-8">
            <Comments type="project" targetId={project.id} />
          </div>

        </div>

        <section className="grid gap-6 border-t border-zinc-100 pt-8 md:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">

          {(project.repo_url || project.deploy_url) && (
            <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 p-4">
              {project.repo_url && (
                <a href={project.repo_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition">
                  <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor" className="text-zinc-500 shrink-0"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>
                  Repositório
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 ml-auto"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1={10} y1={14} x2={21} y2={3}/></svg>
                </a>
              )}
              {project.deploy_url && (
                <a href={project.deploy_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-[#2F9E41] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition">
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><circle cx={12} cy={12} r={10}/><line x1={2} y1={12} x2={22} y2={12}/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  Ver demo
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="ml-auto opacity-70"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1={10} y1={14} x2={21} y2={3}/></svg>
                </a>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2.5 rounded-2xl border border-zinc-200 p-4">
            <p className="text-sm font-semibold text-zinc-700">Detalhes</p>
            {projectPeriod && (
              <div className="flex items-center gap-2.5">
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 shrink-0"><path d="M8 2v4"/><path d="M16 2v4"/><rect width={18} height={18} x={3} y={4} rx={2}/><path d="M3 10h18"/></svg>
                <span className="text-sm text-zinc-500">{projectPeriod}</span>
              </div>
            )}
            {project.semester && (
              <div className="flex items-center gap-2.5">
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 shrink-0"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                <span className="text-sm text-zinc-500">Desenvolvido no {project.semester}{String.fromCharCode(186)} semestre</span>
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 shrink-0"><rect x={3} y={4} width={18} height={18} rx={2} ry={2}/><line x1={16} y1={2} x2={16} y2={6}/><line x1={8} y1={2} x2={8} y2={6}/><line x1={3} y1={10} x2={21} y2={10}/></svg>
              <span className="text-sm text-zinc-500">Publicado em {createdAt}</span>
            </div>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-col gap-2.5 rounded-2xl border border-zinc-200 p-4">
              <p className="text-sm font-semibold text-zinc-700">Tecnologias</p>
              <div className="flex flex-wrap gap-1.5">
                {tags.map(({ tag_name }) => (
                  <span key={tag_name} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                    {tag_name}
                  </span>
                ))}
              </div>
            </div>
          )}

        </section>
      </div>
    </div>
  )
}

function isVideoMedia(media: { image_url: string; media_type?: string | null }) {
  if (media.media_type === 'video') return true
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(media.image_url)
}

function formatProjectPeriod(start: string | null, end: string | null) {
  if (!start && !end) return null
  const format = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR')
  if (start && end && start !== end) return `${format(start)} até ${format(end)}`
  if (start) return `Início em ${format(start)}`
  if (end) return `Término em ${format(end)}`
  return null
}
