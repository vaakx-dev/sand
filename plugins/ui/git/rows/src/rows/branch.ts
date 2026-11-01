import type { Kit } from '@sand/ui-kit/contract'
import { span } from '@vaakx-dev/vrui'

const worktreeMark = ({ icon }: Kit) => span({ class: 'inline-flex shrink-0' }, icon('worktree', 14))

export const branchMeta = (kit: Kit, branch: string, worktree: boolean) =>
  span(
    { class: 'flex min-w-0 items-center gap-1.5', title: worktree ? `Worktree on ${branch}` : branch },
    worktree ? worktreeMark(kit) : null,
    span({ class: 'truncate' }, branch),
  )
