import type { GitPlace, GitStatus } from '@sand/git/contract'
import { threadChange, threadSelect, threadsChange } from '@sand/web-client/contract'
import type { Dispose } from 'drydock'
import type { WorkspaceContext } from '../inject'
import { placeKey, repoOf } from '../paths'
import type { WorktreeCache } from '../worktrees/cache'

const threadPlace = (ctx: WorkspaceContext): GitPlace | undefined => {
  const chat = ctx.threads.current()
  return chat && chat.info.kind !== 'quick' ? { cwd: chat.info.cwd, device: chat.device } : undefined
}

export const preloadWorktrees = (ctx: WorkspaceContext, cache: WorktreeCache) => {
  let stop: Dispose | undefined
  let followed: string | undefined

  const sync = () => {
    const at = threadPlace(ctx)
    const key = at && placeKey(at)
    if (key === followed) return
    followed = key
    void stop?.()
    stop = undefined
    if (!at) return
    const check = (status: GitStatus | undefined) => {
      if (repoOf(status)?.worktree) cache.ensure(at)
    }
    check(ctx.gitStatus.current(at))
    stop = ctx.gitStatus.follow(at, check)
  }

  ctx.on(threadSelect, sync)
  ctx.on(threadsChange, sync)
  ctx.on(threadChange, sync)
  ctx.effect(() => {
    sync()
    return () => {
      void stop?.()
      stop = undefined
      followed = undefined
    }
  })
}
