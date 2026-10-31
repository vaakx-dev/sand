import { folderName } from '@sand/util'
import type { Worktree } from '@sand/worktrees/contract'
import type { WorkspaceContext } from '../inject'
import { toastId } from '../toast'

export const restoreWorktree = async (ctx: WorkspaceContext, device: string, tree: Worktree) => {
  const restored = await ctx.toasts.attempt(toastId, 'Could not restore the worktree', () => ctx.worktrees.restore({ path: tree.path }, device))
  if (restored) ctx.toasts.show({ id: toastId, tone: 'success', title: `Restored ${restored.branch ?? folderName(restored.path)}` })
}
