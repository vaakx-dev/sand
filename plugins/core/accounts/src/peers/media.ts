import type { Message } from '@sand/chats/contract'
import type { Media } from '@sand/media/contract'
import { mediaBlocks } from '@sand/chats/prompt'
import type { Carried } from '../share/media'

export const carriedMedia = (media: Media, messages: Message[]): Carried => {
  const carried: Carried = {}
  for (const block of mediaBlocks(messages)) {
    if (carried[block.hash]) continue
    const data = media.data(block)
    if (data !== undefined) carried[block.hash] = { mediaType: block.mediaType, data }
  }
  return carried
}
