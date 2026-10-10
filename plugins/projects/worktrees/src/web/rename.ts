import { errorMessage } from '@sand/dom'
import type { WebContext, WorktreeClient } from './client'

export const renamer = (ctx: WebContext, client: WorktreeClient) => async () => {
  const thread = ctx.threads.current()
  if (!thread) return
  try {
    const { later } = await client.rename(thread.id)
    if (later) ctx.notify?.push('The worktree gets a new name when this turn ends')
  } catch (error) {
    ctx.notify?.push(`Could not rename the worktree: ${errorMessage(error)}`, { level: 'error' })
  }
}
