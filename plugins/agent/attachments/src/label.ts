import type { Media } from '@sand/media/contract'
import { imageLabel, isImageLabel, type UserContent } from '@sand/chats/contract'

const labeled = (media: Media, block: UserContent, next?: UserContent): UserContent[] => {
  if (isImageLabel(block, next)) return []
  if (block.type !== 'image') return [block]
  return [{ type: 'text', text: imageLabel(block.name, media.path(block)) }, block]
}

export const labelImages = (media: Media, content: UserContent[]) => content.flatMap((block, index) => labeled(media, block, content[index + 1]))
