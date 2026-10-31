import type { GitMenuContext, GitMenuSection } from '@sand/git-control/contract'
import type { GitPlace } from '@sand/git/contract'
import type { IconName } from '@sand/ui-kit/contract'
import type { Child } from '@vaakx-dev/vrui'
import type { WorkspaceContext } from '../inject'
import { menuText } from '../menu-text'
import { repoOf, waitReason } from '../paths'
import type { WorktreeCache } from '../worktrees/cache'
import { worktreeAt } from '../worktrees/find'
import { moveThread } from './move'
import { removeWorktree } from './remove'

interface SectionEntry {
  icon: IconName
  title: string
  detail?: string
  danger?: boolean
  run(): void
}

const entry = (ctx: WorkspaceContext, { close, thread }: GitMenuContext, item: SectionEntry): Child => {
  const reason = thread?.running ? waitReason : undefined
  return ctx.kit.menuItem(
    {
      icon: item.icon,
      tone: item.danger ? 'danger' : undefined,
      disabled: Boolean(reason),
      onClick: () => {
        close()
        item.run()
      },
    },
    menuText(ctx.kit, { title: item.title, detail: item.detail, reason }),
  )
}

const items = (ctx: WorkspaceContext, cache: WorktreeCache, context: GitMenuContext): Child[] => {
  const { status, place, thread } = context
  const local = repoOf(status)
  if (!local || !thread || thread.info.kind === 'quick') return []
  if (!local.worktree)
    return [
      entry(ctx, context, {
        icon: 'worktree',
        title: 'Move to a new worktree…',
        detail: 'Its own folder and branch; this checkout stays as it is',
        run: () => void moveThread(ctx, thread),
      }),
    ]
  if (madeElsewhere(cache, place)) return []
  return [entry(ctx, context, { icon: 'trash', title: 'Remove this worktree…', danger: true, run: () => void removeWorktree(ctx, cache, place) })]
}

const madeElsewhere = (cache: WorktreeCache, place: GitPlace) => {
  const list = cache.get(place)
  const known = list && worktreeAt(list, place.cwd)
  return known ? !known.sand : false
}

export const threadSection = (ctx: WorkspaceContext, cache: WorktreeCache): GitMenuSection => ({
  id: 'git-workspace',
  order: 50,
  items: context => items(ctx, cache, context),
})
