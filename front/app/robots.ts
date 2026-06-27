import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/api',
          '/api/',
          '/auth',
          '/auth/',
          '/login',
          '/cadastro',
          '/onboarding',
          '/redefinir-senha',
          '/esqueci-senha',
          '/perfil',
          '/meus-artigos',
          '/meus-projetos',
          '/artigos/novo',
          '/projetos/novo',
          '/*/editar',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
