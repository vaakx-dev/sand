import type { Hidden } from '../folder/hidden'
import { emptyState, readState, writeState, type FolderState } from '../folder/store'
import { commitTree, folderTree } from '../snapshot/tree'
import { remaining } from './remaining'

export const finalise = async (hidden: Hidden, state: FolderState) => {
  const tree = await folderTree(hidden)
  const head = await commitTree(hidden, tree, [state.ours, state.pending], 'sand sync merge')
  await writeState(hidden, { ...emptyState(), head })
  return head
}

export const settle = async (hidden: Hidden): Promise<FolderState> => {
  const state = await readState(hidden)
  if (!state.pending) return state
  const open = await remaining(hidden, state)
  if (open.length === 0) {
    await finalise(hidden, state)
    return readState(hidden)
  }
  const next = { ...state, conflicts: open }
  await writeState(hidden, next)
  return next
}
