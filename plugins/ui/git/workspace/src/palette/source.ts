import { composer } from '@sand/composer/contract'
import { type GitPlace, type GitRepoLocal, repoOf } from '@sand/git/contract'
import type { PaletteSource } from '@sand/palette/contract'
import { uuid } from '@sand/util'
import { defaultBranch } from '../draft/choice'
import type { DraftChoices } from '../draft/choices'
import type { WorkspaceContext } from '../inject'
import { toastId } from '../toast'
import type { WorktreeCache } from '../worktrees/cache'
import { restorePage } from './restore'

const projectPlace = (place: GitPlace, local: GitRepoLocal): GitPlace => (local.worktree ? { cwd: local.main, device: place.device } : place)

const newWorktreeThread = async (ctx: WorkspaceContext, choices: DraftChoices, place: GitPlace) => {
  const id = uuid()
  choices.set(id, { kind: 'new' })
  try {
    await ctx.threads.draft(place.cwd, place.device, id)
    ctx.get(composer)?.focus()
  } catch (error) {
    choices.forget(id)
    ctx.toasts.error(toastId, 'Could not open a new thread', error)
  }
}

export const workspaceSource = (ctx: WorkspaceContext, choices: DraftChoices, cache: WorktreeCache): PaletteSource => ({
  id: 'git-workspace',
  order: 19,
  items: () => {
    const current = ctx.gitStatus.current.get()
    const local = repoOf(current?.status)
    if (!current || !local) return []
    const project = projectPlace(current.place, local)
    return [
      {
        id: 'git-workspace:new-thread',
        group: 'Actions',
        icon: 'worktree',
        label: 'New thread in a worktree',
        detail: `Its own folder and branch, from ${defaultBranch(local)}`,
        search: 'git worktree new thread branch',
        run: () => newWorktreeThread(ctx, choices, project),
      },
      {
        id: 'git-workspace:restore',
        group: 'Actions',
        icon: 'retry',
        label: 'Restore a removed worktree…',
        search: 'git worktree restore undo removed',
        page: () => restorePage(ctx, cache, project),
      },
    ]
  },
})
