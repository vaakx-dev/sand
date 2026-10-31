import { type GitActionContext, gitBaseRank, type GitPrimaryAction } from '@sand/git-control/contract'
import type { ThreadPullsClient } from '@sand/git-pulls/contract'
import type { Sig } from '@vaakx-dev/vrui'
import type { WorkspaceContext } from '../inject'
import type { WorktreeCache } from '../worktrees/cache'
import { isSandWorktree } from '../worktrees/sand'
import { removeWorktree } from './remove'

const mergedPull = (pulls: ThreadPullsClient | undefined, { base, thread }: GitActionContext) => {
  if (base || !pulls || !thread) return undefined
  const primary = pulls.primary(thread.id)
  return primary?.summary?.state === 'merged' ? primary : undefined
}

export const cleanUpAction = (ctx: WorkspaceContext, cache: WorktreeCache, pulls: Sig<ThreadPullsClient | undefined>): GitPrimaryAction => ({
  id: 'git-workspace.clean-up',
  decide: context => {
    const merged = mergedPull(pulls.get(), context)
    if (!merged || !isSandWorktree(cache, context.place)) return undefined
    return {
      label: 'Clean up',
      icon: 'trash',
      title: `#${merged.number} is merged. Remove this thread's worktree and its branch.`,
      rank: gitBaseRank + 10,
    }
  },
  run: async context => {
    await removeWorktree(ctx, cache, context.place)
  },
})
