import { repoOf } from '@sand/git/contract'
import { owned } from '@sand/web-client/reactive'
import { effect, untrack } from '@vaakx-dev/vrui'
import type { WorkspaceContext } from '../inject'
import type { WorktreeCache } from '../worktrees/cache'

export const preloadWorktrees = (ctx: WorkspaceContext, cache: WorktreeCache) =>
  owned(ctx, () =>
    effect(() => {
      const current = ctx.gitStatus.current.get()
      if (current && repoOf(current.status)?.worktree) untrack(() => cache.ensure(current.place))
    }),
  )
