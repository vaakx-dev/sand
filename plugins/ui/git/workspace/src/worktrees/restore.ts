import type { Worktree } from '@sand/worktrees/contract'
import type { WorkspaceContext } from '../inject'
import { notify, notifyError } from '../notify'
import { folderName } from '../paths'

export const restoreWorktree = async (ctx: WorkspaceContext, device: string, tree: Worktree) => {
  try {
    const restored = await ctx.worktrees.restore({ path: tree.path }, device)
    notify(ctx, { tone: 'success', title: `Restored ${restored.branch ?? folderName(restored.path)}` })
  } catch (error) {
    notifyError(ctx, 'Could not restore the worktree', error)
  }
}
