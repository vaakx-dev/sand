import { RequestRejected, type LLMRequest } from '@sand/accounts/contract'
import { isMediaBlock, type MediaBlock, type Message } from '@sand/chats/contract'
import type { Media } from '@sand/media/contract'

const mediaIn = (message: Message): MediaBlock[] =>
  message.content.flatMap(block => {
    if (isMediaBlock(block)) return [block]
    return block.type === 'tool_result' && Array.isArray(block.content) ? block.content.filter(isMediaBlock) : []
  })

const unanswered = ({ messages }: LLMRequest) => {
  const answered = messages.findLastIndex(message => message.role === 'assistant')
  return messages.slice(answered + 1).flatMap(mediaIn).reverse()
}

const readable = (media: Media) => (block: MediaBlock) => media.data(block) !== undefined

export const recoverRejected = async <T>(media: Media | undefined, request: LLMRequest, error: unknown, attempt: () => Promise<T>): Promise<T> => {
  const suspects = media ? unanswered(request).filter(readable(media)) : []
  if (!media || !suspects.length) throw error
  const without = async (left: MediaBlock[]) => {
    left.forEach(block => media.exclude(block))
    try {
      return await attempt()
    } catch (next) {
      left.forEach(block => media.include(block))
      throw next
    }
  }
  for (const suspect of suspects.length > 1 ? suspects : []) {
    try {
      return await without([suspect])
    } catch (next) {
      if (!(next instanceof RequestRejected)) throw next
    }
  }
  try {
    return await without(suspects)
  } catch (next) {
    throw next instanceof RequestRejected ? error : next
  }
}
