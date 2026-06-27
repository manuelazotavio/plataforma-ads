import type { MetadataRoute } from 'next'
import { supabase } from '@/app/lib/supabase'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'

type SitemapEntry = MetadataRoute.Sitemap[number]

function url(path: string) {
  return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`
}

function dateOrNow(value?: string | null) {
  return value ? new Date(value) : new Date()
}

function staticEntry(path: string, priority: number, changeFrequency: SitemapEntry['changeFrequency'] = 'weekly'): SitemapEntry {
  return {
    url: url(path),
    lastModified: new Date(),
    changeFrequency,
    priority,
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [
    { data: projects },
    { data: articles },
    { data: events },
    { data: jobs },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('id, created_at')
      .eq('approved', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('articles')
      .select('id, published_at')
      .eq('status', 'publicado')
      .order('published_at', { ascending: false })
      .limit(500),
    supabase
      .from('events')
      .select('id, start_date')
      .eq('is_active', true)
      .order('start_date', { ascending: false })
      .limit(500),
    supabase
      .from('jobs')
      .select('id, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  return [
    staticEntry('/', 1, 'daily'),
    staticEntry('/projetos', 0.9, 'daily'),
    staticEntry('/artigos', 0.9, 'daily'),
    staticEntry('/eventos', 0.8, 'daily'),
    staticEntry('/vagas', 0.8, 'daily'),
    staticEntry('/curso', 0.8, 'monthly'),
    staticEntry('/forum', 0.7, 'daily'),
    staticEntry('/egressos', 0.7, 'weekly'),
    staticEntry('/ranking', 0.6, 'weekly'),
    staticEntry('/loja', 0.6, 'weekly'),
    staticEntry('/area-aluno', 0.6, 'monthly'),
    staticEntry('/contato', 0.4, 'monthly'),
    staticEntry('/regras', 0.3, 'yearly'),
    staticEntry('/privacidade', 0.3, 'yearly'),
    staticEntry('/contrato', 0.3, 'yearly'),
    staticEntry('/acessibilidade', 0.3, 'yearly'),
    ...((projects ?? []).map((project) => ({
      url: url(`/projetos/${project.id}`),
      lastModified: dateOrNow(project.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))),
    ...((articles ?? []).map((article) => ({
      url: url(`/artigos/${article.id}`),
      lastModified: dateOrNow(article.published_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))),
    ...((events ?? []).map((event) => ({
      url: url(`/eventos/${event.id}`),
      lastModified: dateOrNow(event.start_date),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))),
    ...((jobs ?? []).map((job) => ({
      url: url(`/vagas/${job.id}`),
      lastModified: dateOrNow(job.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))),
  ]
}
