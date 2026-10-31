import type { GitControl } from '@sand/git-control/contract'
import type { GitStatus } from '@sand/git/contract'
import type { PullPlace } from '../contract'
import type { PullsContext } from '../inject'
import type { Block } from './facts'

export interface BlockFix {
  label: string
  title?: string
  run(): void
}

const moveFix = (ctx: PullsContext, control: GitControl, at: PullPlace, status: GitStatus): BlockFix | undefined => {
  const thread = ctx.threads.get(at.session)
  const move = thread && control.moves.offered({ status, place: at, thread })[0]
  return move && { label: move.label, title: move.title, run: () => void move.run(thread) }
}

export const blockFix = (ctx: PullsContext, control: GitControl | undefined, at: PullPlace, status: GitStatus | undefined, block: Block | undefined) => {
  if (!control || !status || !block?.fix) return undefined
  const moved = block.fix === 'move' ? moveFix(ctx, control, at, status) : undefined
  return moved ?? { label: 'Switch branch…', title: 'Pick or create a branch for this change', run: () => control.switchBranch(at) }
}
