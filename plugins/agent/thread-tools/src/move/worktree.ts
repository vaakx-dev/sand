import { plural } from '@sand/kit'
import { longCall } from '@sand/kit/host'
import type { FoundThread, Pcs } from '@sand/pc-link/contract'
import type { MoveResult, WorktreeState } from '@sand/worktrees/contract'

export interface WorktreeMove {
  branch: string
  base?: string
}

const stateOf = async (pcs: Pcs, { pc, thread }: FoundThread) => {
  const state = await pcs.call<WorktreeState | null>({ type: 'worktrees.list', cwd: thread.cwd }, pc.id)
  if (!state) throw new Error(`${thread.cwd} on ${pc.name} isn't in a git repository`)
  return state
}

export const checkWorktreeMove = async (pcs: Pcs, found: FoundThread, { branch }: WorktreeMove) => {
  const state = await stateOf(pcs, found)
  if (state.branches.includes(branch)) throw new Error(`The branch ${branch} already exists; pick a new name`)
}

const setupNote = ({ setup }: WorktreeState, { setupError }: MoveResult) => {
  const steps = [...setup.copy.map(name => `copy ${name}`), ...setup.run]
  if (!steps.length) return ''
  return setupError ? ` Its .sand/worktree.toml setup stopped: ${setupError}.` : ` Ran its .sand/worktree.toml setup: ${steps.join('; ')}.`
}

export const moveToWorktree = async (pcs: Pcs, found: FoundThread, { branch, base }: WorktreeMove) => {
  const state = await stateOf(pcs, found)
  const session = found.thread.id
  const moved = await pcs.call<MoveResult>({ type: 'worktrees.move', session, branch, base }, found.pc.id, longCall)
  const carried = state.changed ? ` ${plural(state.changed, 'uncommitted change')} moved with it.` : ''
  return `Moved "${found.thread.title ?? session}" on ${found.pc.name} into a new worktree at ${moved.path} on branch ${moved.branch}.${carried}${setupNote(state, moved)}`
}
