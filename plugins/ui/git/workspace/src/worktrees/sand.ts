import type { GitPlace } from '@sand/git/contract'
import type { WorktreeCache } from './cache'
import { worktreeAt } from './find'

export const isSandWorktree = (cache: WorktreeCache, place: GitPlace) => {
  cache.ensure(place)
  const list = cache.get(place)
  return list ? (worktreeAt(list, place.cwd)?.sand ?? false) : undefined
}
