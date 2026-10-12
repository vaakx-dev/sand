import { errorMessage } from '@sand/kit'
import type { WebContext, WorktreeClient } from './client'

export const renamer = (ctx: WebContext, client: WorktreeClient) => async () => {
  const thread = ctx.threads.current()
  if (!thread) return
  try {
    await client.rename(thread.id)
  } catch (error) {
    ctx.notify?.push(`Could not rename the branch: ${errorMessage(error)}`, { level: 'error' })
  }
}
