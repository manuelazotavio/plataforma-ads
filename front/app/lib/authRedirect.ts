export function getAuthRedirectUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  const origin = siteUrl || 'https://ads-conecta.vercel.app'

  return `${origin}/auth/callback`
}
