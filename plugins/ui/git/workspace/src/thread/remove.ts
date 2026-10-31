import type { GitPlace } from '@sand/git/contract'
import { picker } from '@sand/picker/contract'
import { type Worktree, worktreesRemove } from '@sand/worktrees/contract'
import type { WorkspaceContext } from '../inject'
import { notify, notifyError } from '../notify'
import { folderName } from '../paths'
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
  notify(ctx, {
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

export const removeWorktree = async (ctx: WorkspaceContext, cache: WorktreeCache, place: GitPlace) => {
  try {
    const tree = await sandWorktree(cache, place)
    const input = { path: tree.path }
    const first = await ctx.wire.call(worktreesRemove, input, place.device)
    if (first.removed) return removed(ctx, place, tree)
    if (!(await confirmForce(ctx, first.message))) return
    const forced = await ctx.wire.call(worktreesRemove, { ...input, force: true }, place.device)
    if (forced.removed) return removed(ctx, place, tree)
    notifyError(ctx, removeTitle, forced.message)
  } catch (error) {
    notifyError(ctx, removeTitle, error)
  }
}
