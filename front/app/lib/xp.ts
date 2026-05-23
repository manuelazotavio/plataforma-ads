
export const XP_PROJECT = 50
export const XP_ARTICLE = 40
export const XP_TOPIC = 20
export const XP_COMMENT = 10
export const XP_LIKE_RECEIVED = 5


export const XP_PROFILE_AVATAR = 15
export const XP_PROFILE_BIO = 15
export const XP_PROFILE_LINK = 10 

export type XpInputs = {
  projectsCount: number
  articlesCount: number
  topicsCount: number
  commentsCount: number
  likesReceived: number
  hasAvatar: boolean
  hasBio: boolean
  linksCount: number
}

export function computeXp(i: XpInputs): number {
  return (
    i.projectsCount * XP_PROJECT +
    i.articlesCount * XP_ARTICLE +
    i.topicsCount * XP_TOPIC +
    i.commentsCount * XP_COMMENT +
    i.likesReceived * XP_LIKE_RECEIVED +
    (i.hasAvatar ? XP_PROFILE_AVATAR : 0) +
    (i.hasBio ? XP_PROFILE_BIO : 0) +
    i.linksCount * XP_PROFILE_LINK
  )
}

export function countProfileLinks(profile: {
  github_url?: string | null
  linkedin_url?: string | null
  portfolio_url?: string | null
}): number {
  let count = 0
  if (profile.github_url?.trim()) count++
  if (profile.linkedin_url?.trim()) count++
  if (profile.portfolio_url?.trim()) count++
  return count
}

export function hasNonEmpty(value: string | null | undefined): boolean {
  return !!value && value.trim().length > 0
}
