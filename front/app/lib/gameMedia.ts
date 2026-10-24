export type GameMedia = {
  url: string
  media_type: 'image' | 'video'
  display_order: number
}

export const GAME_MEDIA_SELECT = 'community_game_media(url, media_type, display_order)'

export function sortGameMedia(media: GameMedia[] | null | undefined) {
  return [...(media ?? [])].sort((a, b) => a.display_order - b.display_order)
}
