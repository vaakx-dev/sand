import type { SyncApplied } from '../contract'
import { checkout } from '../apply/checkout'
import { unmarkedStamps } from '../conflicts/remaining'
import { writeHead, writeState } from '../folder/state'
import type { SyncedFolder } from '../folder/synced'
import { mergeBase } from '../snapshot/lineage'
import { readSnapshot, writeSnapshot } from '../store/snapshots'
import { emptyTree } from '../store/tree'
import { mergeTrees } from './trees'

const treeOf = async (synced: SyncedFolder, id: string | undefined) => (id ? (await readSnapshot(synced.store, id)).tree : emptyTree)

export const mergeSnapshots = async (synced: SyncedFolder, ours: string, theirs: string): Promise<SyncApplied> => {
  const base = await mergeBase(synced.store, ours, theirs)
  const [baseTree, oursTree, theirsTree] = await Promise.all([treeOf(synced, base), treeOf(synced, ours), treeOf(synced, theirs)])
  const merged = await mergeTrees(synced, baseTree, oursTree, theirsTree)
  const changed = await checkout(synced, oursTree, merged.tree)
  if (merged.conflicts.length === 0) {
    const head = await writeSnapshot(synced.store, merged.tree, [ours, theirs])
    await writeHead(synced, head)
    return { result: 'merged', head, conflicts: [], changed }
  }
  const unmarked = await unmarkedStamps(synced, merged.conflicts)
  await writeState(synced, { head: ours, pending: theirs, ours, conflicts: merged.conflicts, unmarked })
  return { result: 'conflicts', head: ours, conflicts: merged.conflicts, changed }
}
