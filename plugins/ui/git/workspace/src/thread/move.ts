import type { GitMove } from '@sand/git-control/contract'
import { repoOf } from '@sand/git/contract'
import { picker } from '@sand/picker/contract'
import type { Thread } from '@sand/web-client/contract'
import type { WorkspaceContext } from '../inject'
import { toastId } from '../toast'

const askBranch = async (ctx: WorkspaceContext) => {
  const ask = ctx.get(picker)
  if (!ask) return ''
  const name = await ask.input('Branch name (leave empty to name it from the thread)', '')
  return name === undefined ? undefined : name.trim()
}

const branchAt = (ctx: WorkspaceContext, cwd: string, device: string) =>
  ctx.gitStatus.status({ cwd, device }).then(
    status => repoOf(status)?.branch,
    error => {
      ctx.report(error)
      return undefined
    },
  )

const move = async (ctx: WorkspaceContext, thread: Thread, branch: string) => {
  const moved = await ctx.worktrees.move({ session: thread.id, branch: branch || undefined, carry: true }, thread.device)
  const name = await branchAt(ctx, moved.cwd, thread.device)
  ctx.toasts.show({ id: toastId, tone: 'success', title: name ? `Moved to ${name}` : 'Moved to a new worktree' })
  if (moved.id !== thread.id) await ctx.threads.select(moved.id)
}

const moveThread = async (ctx: WorkspaceContext, thread: Thread) => {
  const branch = await askBranch(ctx)
  if (branch === undefined) return
  await ctx.toasts.attempt(toastId, 'Could not move to a new worktree', () => move(ctx, thread, branch))
}

export const worktreeMove = (ctx: WorkspaceContext): GitMove => ({
  id: 'git-workspace.move',
  label: 'Move to a new worktree…',
  title: 'Its own folder and branch; this checkout stays as it is',
  offers: ({ status, thread }) => {
    const local = repoOf(status)
    return thread.info.kind !== 'quick' && Boolean(local && !local.worktree)
  },
  run: thread => moveThread(ctx, thread),
})
