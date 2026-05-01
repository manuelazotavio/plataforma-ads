import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import LikeButton from '@/app/components/LikeButton'
import Comments from '@/app/components/Comments'

export default async function ProjetoDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: project } = await supabase
    .from('projects')
    .select('id, title, description, repo_url, deploy_url, semester, is_featured, like_count, created_at, users(name, avatar_url), project_tags(tag_name), project_images(image_url, display_order, media_type)')
    .eq('id', id)
    .single()

  if (!project) notFound()

  const images = (project.project_images as { image_url: string; display_order: number; media_type: string }[])
    .sort((a, b) => a.display_order - b.display_order)
  const tags = project.project_tags as { tag_name: string }[]
  const author = project.users as { name: string; avatar_url: string | null } | null
  const cover = images[0]

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="w-full max-w-2xl mx-auto">

        <Link href="/projetos" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 transition mb-6">
          ← Todos os projetos
        </Link>

        {cover && (
          <div className="relative w-full h-64 rounded-2xl overflow-hidden bg-zinc-100 mb-6">
            {cover.media_type === 'video' ? (
              <video src={cover.image_url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
            ) : (
              <Image src={cover.image_url} alt={project.title} fill className="object-cover" />
            )}
            {project.is_featured && (
              <span className="absolute top-3 left-3 rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                destaque
              </span>
            )}
          </div>
        )}

        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">{project.title}</h1>
            {project.semester && (
              <p className="text-sm text-zinc-400 mt-0.5">{project.semester}º semestre</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <LikeButton type="project" targetId={project.id} initialCount={project.like_count} />
            {project.repo_url && (
              <a href={project.repo_url} target="_blank" rel="noopener noreferrer"
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition">
                GitHub ↗
              </a>
            )}
            {project.deploy_url && (
              <a href={project.deploy_url} target="_blank" rel="noopener noreferrer"
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 transition">
                Demo ↗
              </a>
            )}
          </div>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {tags.map(({ tag_name }) => (
              <span key={tag_name} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
                {tag_name}
              </span>
            ))}
          </div>
        )}

        {author && (
          <div className="flex items-center gap-2 mb-6 pb-6 border-b border-zinc-100">
            {author.avatar_url
              ? <Image src={author.avatar_url} alt={author.name} width={24} height={24} className="rounded-full object-cover" />
              : <div className="w-6 h-6 rounded-full bg-zinc-200" />
            }
            <span className="text-sm text-zinc-500">{author.name}</span>
          </div>
        )}

        {project.description && (
          <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{project.description}</p>
        )}

        <Comments type="project" targetId={project.id} />

        {images.length > 1 && (
          <div className="mt-8 grid grid-cols-2 gap-3">
            {images.slice(1).map((img, i) => (
              <div key={i} className="relative h-40 rounded-xl overflow-hidden bg-zinc-100">
                {img.media_type === 'video' ? (
                  <video src={img.image_url} className="w-full h-full object-cover" controls playsInline />
                ) : (
                  <Image src={img.image_url} alt={`${project.title} - imagem ${i + 2}`} fill className="object-cover" />
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
