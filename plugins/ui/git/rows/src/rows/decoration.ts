import type { RowDecoration, SidebarThread } from '@sand/sidebar/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { PlaceStatuses } from '../places/statuses'
import { branchMeta } from './branch'
import { changeMark } from './change'

const viewOf = (statuses: PlaceStatuses, thread: SidebarThread) =>
  thread.cwd ? statuses.view({ cwd: thread.cwd, device: thread.device }) : undefined

export const gitDecoration = (kit: Kit, statuses: PlaceStatuses): RowDecoration => ({
  id: 'git',
  order: 50,
  meta(thread) {
    const view = viewOf(statuses, thread)
    const branch = view?.branch.get()
    return view && branch ? branchMeta(kit, branch, view.worktree.get()) : null
  },
  mark(thread) {
    const change = viewOf(statuses, thread)?.change.get()
    return change ? changeMark(kit, change) : null
  },
})
