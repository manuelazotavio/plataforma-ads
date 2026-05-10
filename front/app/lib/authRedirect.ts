export function getAuthRedirectUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  const origin = siteUrl || window.location.origin

  return `${origin}/auth/callback`
}
