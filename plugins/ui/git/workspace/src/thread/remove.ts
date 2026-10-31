import type { GitPlace } from '@sand/git/contract'
import { picker } from '@sand/picker/contract'
import { folderName } from '@sand/util'
import type { Worktree } from '@sand/worktrees/contract'
import type { WorkspaceContext } from '../inject'
import { toastId } from '../toast'
import type { WorktreeCache } from '../worktrees/cache'
import { worktreeAt } from '../worktrees/find'
import { restoreWorktree } from '../worktrees/restore'

const removeTitle = 'Could not remove the worktree'

const confirmForce = async (ctx: WorkspaceContext, message: string) => {
  const picked = await ctx.get(picker)?.choose(message, [
    { label: 'Remove anyway', tone: 'error', value: true },
    { label: 'Keep', value: false },
  ])
  return picked?.value === true
}

const removed = (ctx: WorkspaceContext, place: GitPlace, tree: Worktree) =>
  ctx.toasts.show({
    id: toastId,
    tone: 'success',
    title: 'Removed worktree',
    detail: tree.branch ?? folderName(tree.path),
    actions: [{ label: 'Restore', run: () => restoreWorktree(ctx, place.device, tree) }],
  })

const sandWorktree = async (cache: WorktreeCache, place: GitPlace) => {
  const tree = worktreeAt(await cache.load(place), place.cwd)
  if (!tree) throw new Error(`${place.cwd} is no longer in a worktree of this repository.`)
  if (!tree.sand) throw new Error("Sand didn't make this worktree, so it leaves it to you. Remove it with git worktree remove.")
  return tree
}

const remove = async (ctx: WorkspaceContext, cache: WorktreeCache, place: GitPlace) => {
  const tree = await sandWorktree(cache, place)
  const input = { path: tree.path }
  const first = await ctx.worktrees.remove(input, place.device)
  if (!first.removed) {
    if (!(await confirmForce(ctx, first.message))) return
    const forced = await ctx.worktrees.remove({ ...input, force: true }, place.device)
    if (!forced.removed) throw new Error(forced.message)
  }
  removed(ctx, place, tree)
}

export const removeWorktree = (ctx: WorkspaceContext, cache: WorktreeCache, place: GitPlace) => ctx.toasts.attempt(toastId, removeTitle, () => remove(ctx, cache, place))
