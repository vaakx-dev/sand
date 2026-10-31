import type { GitPlace } from '@sand/git/contract'
import type { PaletteItem, PalettePage } from '@sand/palette/contract'
import type { Worktree } from '@sand/worktrees/contract'
import type { WorkspaceContext } from '../inject'
import type { WorktreeCache } from '../worktrees/cache'
import { restoreWorktree } from '../worktrees/restore'
import { worktreeName } from '../draft/existing'

const removedOn = (tree: Worktree) => (tree.removed ? `Removed ${new Date(tree.removed).toLocaleDateString()}` : undefined)

const restoreItem = (ctx: WorkspaceContext, place: GitPlace, tree: Worktree): PaletteItem => ({
  id: `git-workspace-restore:${tree.path}`,
  icon: 'worktree',
  label: worktreeName(tree),
  detail: tree.path,
  meta: removedOn(tree),
  search: tree.base,
  run: () => restoreWorktree(ctx, place.device, tree),
})

export const restorePage = (ctx: WorkspaceContext, cache: WorktreeCache, place: GitPlace): PalettePage => ({
  id: 'git-workspace-restore',
  title: 'Restore a removed worktree',
  placeholder: 'Find a worktree…',
  empty: 'No removed worktrees.',
  async items() {
    const list = await cache.load(place)
    return list
      .filter(tree => tree.sand && tree.removed)
      .sort((a, b) => (b.removed ?? 0) - (a.removed ?? 0))
      .map(tree => restoreItem(ctx, place, tree))
  },
})
