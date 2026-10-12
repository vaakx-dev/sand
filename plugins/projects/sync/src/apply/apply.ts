import type { SyncApplied, SyncMode } from '../contract'
import { mkdir } from 'node:fs/promises'
import { requireSettled } from '../conflicts/settle'
import { readState, writeHead } from '../folder/state'
import type { SyncedFolder } from '../folder/synced'
import { mergeSnapshots } from '../merge/merge'
import { isAncestor } from '../snapshot/lineage'
import { snapshot } from '../snapshot/snapshot'
import { hasSnapshot, readSnapshot } from '../store/snapshots'
import { checkout } from './checkout'

const treeOf = async (synced: SyncedFolder, id: string) => (await readSnapshot(synced.store, id)).tree

const checkoutSnapshot = async (synced: SyncedFolder, current: string, target: string) => {
  const changed = await checkout(synced, await treeOf(synced, current), await treeOf(synced, target))
  await writeHead(synced, target)
  return changed
}

const replace = async (synced: SyncedFolder, target: string): Promise<SyncApplied> => {
  await mkdir(synced.folder, { recursive: true })
  await writeHead(synced, (await readState(synced)).head)
  const { head } = await snapshot(synced)
  const changed = await checkoutSnapshot(synced, head, target)
  return { result: head === target ? 'current' : 'applied', head: target, conflicts: [], changed }
}

export const applySnapshot = async (synced: SyncedFolder, target: string, mode: SyncMode = 'merge'): Promise<SyncApplied> => {
  if (!(await hasSnapshot(synced.store, target))) throw new Error('That snapshot has not been received')
  if (mode === 'replace') return replace(synced, target)
  await requireSettled(synced)
  const { head } = await snapshot(synced)
  if (head === target || (await isAncestor(synced.store, target, head))) return { result: 'current', head, conflicts: [], changed: 0 }
  if (await isAncestor(synced.store, head, target)) return { result: 'applied', head: target, conflicts: [], changed: await checkoutSnapshot(synced, head, target) }
  return mergeSnapshots(synced, head, target)
}
