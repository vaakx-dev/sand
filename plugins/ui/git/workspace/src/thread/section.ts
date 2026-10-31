import type { GitMenuContext, GitMenuSection, GitMove } from '@sand/git-control/contract'
import { type GitPlace, repoOf } from '@sand/git/contract'
import type { IconName } from '@sand/ui-kit/contract'
import type { Child } from '@vaakx-dev/vrui'
import type { WorkspaceContext } from '../inject'
import { menuText } from '../menu-text'
import type { WorktreeCache } from '../worktrees/cache'
import { worktreeAt } from '../worktrees/find'
import { removeWorktree } from './remove'

interface SectionEntry {
  icon: IconName
  title: string
  tip?: string
  danger?: boolean
  run(): void
}

const entry = (ctx: WorkspaceContext, { close, waiting: reason }: GitMenuContext, item: SectionEntry): Child =>
  ctx.kit.menuItem(
    {
      icon: item.icon,
      tone: item.danger ? 'danger' : undefined,
      disabled: Boolean(reason),
      title: item.tip ?? item.title,
      onClick: () => {
        close()
        item.run()
      },
    },
    ...menuText(ctx.kit, { title: item.title, reason }),
  )

const threadOf = ({ status, thread }: GitMenuContext) => {
  const local = repoOf(status)
  return local && thread && thread.info.kind !== 'quick' ? { local, thread } : undefined
}

const madeElsewhere = (cache: WorktreeCache, place: GitPlace) => {
  const list = cache.get(place)
  const known = list && worktreeAt(list, place.cwd)
  return known ? !known.sand : false
}

const moveItems = (ctx: WorkspaceContext, move: GitMove, context: GitMenuContext): Child[] => {
  const { status, place, thread } = context
  if (!thread || !move.offers({ status, place, thread })) return []
  return [entry(ctx, context, { icon: 'worktree', title: move.label, tip: move.title, run: () => void move.run(thread) })]
}

const removeItems = (ctx: WorkspaceContext, cache: WorktreeCache, context: GitMenuContext): Child[] => {
  const found = threadOf(context)
  if (!found?.local.worktree || madeElsewhere(cache, context.place)) return []
  return [entry(ctx, context, { icon: 'trash', title: 'Remove this worktree…', danger: true, run: () => void removeWorktree(ctx, cache, context.place) })]
}

export const moveSection = (ctx: WorkspaceContext, move: GitMove): GitMenuSection => ({
  id: 'git-workspace.move',
  order: 50,
  items: context => moveItems(ctx, move, context),
})

export const removeSection = (ctx: WorkspaceContext, cache: WorktreeCache): GitMenuSection => ({
  id: 'git-workspace.remove',
  order: 1000,
  items: context => removeItems(ctx, cache, context),
})
