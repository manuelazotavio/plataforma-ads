import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

export default async function HomePage() {
  const [
    { data: featuredProjects },
    { data: latestArticles },
    { data: latestTopics },
    { data: recentJobs },
    { data: faculty },
    { count: studentsCount },
    { count: projectsCount },
    { count: articlesCount },
    { count: jobsCount },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('id, title, description, repo_url, deploy_url, like_count, project_tags(tag_name), project_images(image_url, display_order)')
      .order('like_count', { ascending: false })
      .limit(6),

    supabase
      .from('articles')
      .select('id, title, slug, summary, cover_image_url, published_at, like_count, users(name, avatar_url), article_tags(tag_name)')
      .eq('status', 'publicado')
      .order('like_count', { ascending: false })
      .limit(4),

    supabase
      .from('forum_topics')
      .select('id, title, created_at, views_count, replies_count, users(name), forum_categories(name)')
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('jobs')
      .select('id, company, position, location, job_type, work_mode, job_tags(tag_name)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(4),

    supabase
      .from('professors')
      .select('id, name, avatar_url, bio, cargo, years_at_if, email, whatsapp')
      .eq('is_active', true)
      .order('display_order', { ascending: true }),

    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'aluno'),
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'publicado'),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('is_active', true),
  ])

  const stats = [
    { label: 'Alunos', value: studentsCount ?? 0 },
    { label: 'Projetos', value: projectsCount ?? 0 },
    { label: 'Artigos', value: articlesCount ?? 0 },
    { label: 'Vagas ativas', value: jobsCount ?? 0 },
  ]

  return (
    <div className="min-h-screen bg-white">

      
      <nav className="border-b border-zinc-100 sticky top-0 bg-white/90 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-semibold text-zinc-900 text-sm tracking-tight">
            Plataforma ADS
          </Link>
          <div className="hidden sm:flex items-center gap-6 text-sm text-zinc-500">
            <Link href="/projetos" className="hover:text-zinc-900 transition">Projetos</Link>
            <Link href="/artigos" className="hover:text-zinc-900 transition">Artigos</Link>
            <Link href="/forum" className="hover:text-zinc-900 transition">Fórum</Link>
            <Link href="/vagas" className="hover:text-zinc-900 transition">Vagas</Link>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-lg px-3 py-1.5 text-sm text-zinc-600 hover:text-zinc-900 transition">
              Entrar
            </Link>
            <Link href="/cadastro" className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 transition">
              Criar conta
            </Link>
          </div>
        </div>
      </nav>

      
      <section className="bg-white text-zinc-900 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-4">
            Análise e Desenvolvimento de Sistemas
          </p>
          <h1 className="text-4xl sm:text-5xl font-semibold leading-tight mb-4 max-w-2xl">
            A plataforma dos alunos de ADS
          </h1>
          <p className="text-zinc-500 text-lg max-w-xl mb-10">
            Compartilhe projetos, publique artigos, conecte-se com colegas e encontre oportunidades no mercado.
          </p>
          <div className="flex flex-wrap gap-3 mb-16">
            <Link href="/projetos" className="rounded-lg bg-white text-zinc-900 px-5 py-2.5 text-sm font-medium hover:bg-zinc-100 transition">
              Ver projetos
            </Link>
            <Link href="/cadastro" className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-white hover:border-zinc-500 transition">
              Criar conta grátis
            </Link>
          </div>

         
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-t border-zinc-800 pt-10">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-semibold">{s.value.toLocaleString('pt-BR')}</p>
                <p className="text-sm text-zinc-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      
      {(featuredProjects?.length ?? 0) > 0 && (
        <section className="py-16 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <SectionHeader title="Projetos mais curtidos" href="/projetos" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredProjects!.map((project) => {
                const cover = (project.project_images as { image_url: string; display_order: number }[])
                  .sort((a, b) => a.display_order - b.display_order)[0]
                const tags = project.project_tags as { tag_name: string }[]

                return (
                  <div key={project.id} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden flex flex-col">
                    <div className="relative h-40 bg-zinc-100">
                      {cover
                        ? <Image src={cover.image_url} alt={project.title} fill className="object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-zinc-300 text-3xl">◻</div>
                      }
                    </div>
                    <div className="p-4 flex flex-col gap-2 flex-1">
                      <h3 className="text-sm font-semibold text-zinc-900">{project.title}</h3>
                      <p className="text-xs text-zinc-500 line-clamp-2 flex-1">{project.description}</p>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {tags.map(({ tag_name }) => (
                            <span key={tag_name} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">{tag_name}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-3 mt-1">
                        {project.repo_url && (
                          <a href={project.repo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-400 hover:text-zinc-700 transition">GitHub ↗</a>
                        )}
                        {project.deploy_url && (
                          <a href={project.deploy_url} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-400 hover:text-zinc-700 transition">Demo ↗</a>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      
      {(latestArticles?.length ?? 0) > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <SectionHeader title="Artigos mais curtidos" href="/artigos" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {latestArticles!.map((article) => {
                const author = article.users as { name: string; avatar_url: string | null } | null
                const tags = article.article_tags as { tag_name: string }[]

                return (
                  <div key={article.id} className="flex gap-4 rounded-2xl border border-zinc-200 p-4 hover:border-zinc-300 transition">
                    {article.cover_image_url && (
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0">
                        <Image src={article.cover_image_url} alt={article.title} fill className="object-cover" />
                      </div>
                    )}
                    <div className="flex flex-col justify-between flex-1 min-w-0">
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-900 line-clamp-2">{article.title}</h3>
                        <p className="text-xs text-zinc-500 line-clamp-2 mt-0.5">{article.summary}</p>
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {tags.slice(0, 3).map(({ tag_name }) => (
                              <span key={tag_name} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">{tag_name}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {author?.avatar_url
                          ? <Image src={author.avatar_url} alt={author.name} width={16} height={16} className="rounded-full object-cover" />
                          : <div className="w-4 h-4 rounded-full bg-zinc-200" />
                        }
                        <span className="text-xs text-zinc-400">{author?.name}</span>
                        <span className="text-xs text-zinc-300">·</span>
                        <span className="text-xs text-zinc-400">
                          {article.published_at ? new Date(article.published_at).toLocaleDateString('pt-BR') : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">

        
          {(recentJobs?.length ?? 0) > 0 && (
            <div>
              <SectionHeader title="Vagas recentes" href="/vagas" />
              <div className="flex flex-col gap-3">
                {recentJobs!.map((job) => {
                  const tags = job.job_tags as { tag_name: string }[]
                  return (
                    <div key={job.id} className="bg-white rounded-2xl border border-zinc-200 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-900">{job.position}</h3>
                          <p className="text-xs text-zinc-500">{job.company}{job.location ? ` · ${job.location}` : ''}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Badge>{job.job_type}</Badge>
                          <Badge>{job.work_mode}</Badge>
                        </div>
                      </div>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {tags.slice(0, 4).map(({ tag_name }) => (
                            <span key={tag_name} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">{tag_name}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          
          {(latestTopics?.length ?? 0) > 0 && (
            <div>
              <SectionHeader title="Fórum" href="/forum" />
              <div className="flex flex-col divide-y divide-zinc-200 bg-white rounded-2xl border border-zinc-200 overflow-hidden">
                {latestTopics!.map((topic) => {
                  const author = topic.users as { name: string } | null
                  const category = topic.forum_categories as { name: string } | null
                  return (
                    <div key={topic.id} className="p-4 hover:bg-zinc-50 transition">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-medium text-zinc-900 line-clamp-1">{topic.title}</h3>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {category && <span className="text-xs text-zinc-400 bg-zinc-100 rounded px-1.5 py-0.5">{category.name}</span>}
                        <span className="text-xs text-zinc-400">{author?.name}</span>
                        <span className="text-xs text-zinc-300">·</span>
                        <span className="text-xs text-zinc-400">{topic.replies_count} respostas</span>
                        <span className="text-xs text-zinc-300">·</span>
                        <span className="text-xs text-zinc-400">{topic.views_count} views</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      
      {(faculty?.length ?? 0) > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <SectionHeader title="Corpo docente" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {faculty!.map((prof: {
                id: string; name: string; avatar_url: string | null; bio: string | null;
                cargo: string | null; years_at_if: number | null; email: string | null; whatsapp: string | null
              }) => (
                <div key={prof.id} className="flex gap-4 rounded-2xl border border-zinc-200 p-4 hover:border-zinc-300 transition">
                  <div className="relative w-14 h-14 rounded-full overflow-hidden bg-zinc-100 border border-zinc-200 shrink-0">
                    {prof.avatar_url
                      ? <Image src={prof.avatar_url} alt={prof.name} fill className="object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-zinc-300 text-xl font-medium">{prof.name.charAt(0)}</div>
                    }
                  </div>
                  <div className="flex flex-col justify-center min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 truncate">{prof.name}</p>
                    {prof.cargo && <p className="text-xs text-zinc-500">{prof.cargo}</p>}
                    {prof.years_at_if != null && prof.years_at_if > 0 && (
                      <p className="text-xs text-zinc-400">{prof.years_at_if} {prof.years_at_if === 1 ? 'ano' : 'anos'} no IF</p>
                    )}
                    {prof.bio && <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">{prof.bio}</p>}
                    <div className="flex gap-3 mt-1.5">
                      {prof.email && (
                        <a href={`mailto:${prof.email}`} className="text-xs text-zinc-400 hover:text-zinc-700 transition truncate">
                          ✉ {prof.email}
                        </a>
                      )}
                      {prof.whatsapp && (
                        <a
                          href={`https://wa.me/${prof.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-zinc-400 hover:text-green-600 transition shrink-0"
                        >
                          WhatsApp ↗
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      
      <footer className="border-t border-zinc-100 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <p>Plataforma ADS — Análise e Desenvolvimento de Sistemas</p>
          <div className="flex gap-4">
            <Link href="/projetos" className="hover:text-zinc-700 transition">Projetos</Link>
            <Link href="/artigos" className="hover:text-zinc-700 transition">Artigos</Link>
            <Link href="/forum" className="hover:text-zinc-700 transition">Fórum</Link>
            <Link href="/vagas" className="hover:text-zinc-700 transition">Vagas</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-semibold text-zinc-900">{title}</h2>
      {href && (
        <Link href={href} className="text-sm text-zinc-500 hover:text-zinc-900 transition">
          Ver todos →
        </Link>
      )}
    </div>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">{children}</span>
  )
}
