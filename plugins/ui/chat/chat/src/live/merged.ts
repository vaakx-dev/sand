import type { Thread } from '@sand/web-client/contract'
import type { ChatContext } from '../context'
import { threadChanges } from './changes'

export const mergedCheck = (ctx: ChatContext) => {
  const changesOf = threadChanges(ctx)
  return (thread: Thread) => !thread.waiting && !thread.running && changesOf(thread.id)?.state === 'merged'
}
