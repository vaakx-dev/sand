import { readState, writeHead, writeState, type FolderState } from '../folder/state'
import type { SyncedFolder } from '../folder/synced'
import { scanFolder } from '../snapshot/snapshot'
import { writeSnapshot } from '../store/snapshots'
import { remaining } from './remaining'

export const finalise = async (synced: SyncedFolder, state: FolderState) => {
  const { tree } = await scanFolder(synced)
  const head = await writeSnapshot(synced.store, tree, [state.ours, state.pending])
  await writeHead(synced, head)
  return head
}

export const settle = async (synced: SyncedFolder): Promise<FolderState> => {
  const state = await readState(synced)
  if (!state.pending) return state
  const open = await remaining(synced, state)
  if (open.length === 0) {
    await finalise(synced, state)
    return readState(synced)
  }
  const next = { ...state, conflicts: open }
  await writeState(synced, next)
  return next
}

export const requireSettled = async (synced: SyncedFolder) => {
  if ((await settle(synced)).pending) throw new Error('Resolve the conflicts in this folder first')
}
