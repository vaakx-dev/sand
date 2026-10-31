import { picker } from '@sand/picker/contract'
import type { Thread } from '@sand/web-client/contract'
import type { WorkspaceContext } from '../inject'
import { notify, notifyError } from '../notify'
import { repoOf } from '../paths'

const askBranch = async (ctx: WorkspaceContext) => {
  const ask = ctx.get(picker)
  if (!ask) return ''
  const name = await ask.input('Branch name (leave empty to name it from the thread)', '')
  return name === undefined ? undefined : name.trim()
}

const branchAt = (ctx: WorkspaceContext, cwd: string, device: string) =>
  ctx.gitStatus.status({ cwd, device }).then(
    status => repoOf(status)?.branch,
    () => undefined,
  )

export const moveThread = async (ctx: WorkspaceContext, thread: Thread) => {
  const branch = await askBranch(ctx)
  if (branch === undefined) return
  try {
    const moved = await ctx.worktrees.move({ session: thread.id, branch: branch || undefined, carry: true }, thread.device)
    const name = await branchAt(ctx, moved.cwd, thread.device)
    notify(ctx, { tone: 'success', title: name ? `Moved to ${name}` : 'Moved to a new worktree' })
    if (moved.id !== thread.id) await ctx.threads.select(moved.id)
  } catch (error) {
    notifyError(ctx, 'Could not move to a new worktree', error)
  }
}
