import type { RowDecoration, SidebarThread } from '@sand/sidebar/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { PlaceStatuses } from '../places/statuses'
import { changeBadge } from './badge'

const viewOf = (statuses: PlaceStatuses, thread: SidebarThread) =>
  thread.cwd ? statuses.view({ cwd: thread.cwd, device: thread.device }) : undefined

export const gitDecoration = (kit: Kit, statuses: PlaceStatuses): RowDecoration => ({
  id: 'git',
  order: 50,
  place: thread => {
    const view = viewOf(statuses, thread)
    return view?.worktree.get() ? view.branch.get() : undefined
  },
  subtitle: thread => {
    const view = viewOf(statuses, thread)
    return view?.worktree.get() ? undefined : view?.branch.get()
  },
  badge(thread) {
    const change = viewOf(statuses, thread)?.change.get()
    return change ? changeBadge(kit, change) : null
  },
})
