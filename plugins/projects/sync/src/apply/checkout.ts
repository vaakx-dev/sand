import { limited } from '@sand/kit'
import type { SyncedFolder } from '../folder/synced'
import type { Store } from '../store/store'
import { readTreeMap, sameEntry, type TreeEntry } from '../store/tree'
import { removeFiles, writeFiles, type FileWrite } from './files'

interface TreeDiff {
  removed: string[]
  written: FileWrite[]
}

const diffTrees = async (store: Store, from: string, to: string): Promise<TreeDiff> => {
  const diff: TreeDiff = { removed: [], written: [] }
  const run = limited(32)

  const compareTrees = async (fromId: string | undefined, toId: string | undefined, prefix: string) => {
    if (fromId === toId) return
    const [before, after] = await Promise.all([run(() => readTreeMap(store, fromId)), run(() => readTreeMap(store, toId))])
    const names = new Set([...before.keys(), ...after.keys()])
    await Promise.all([...names].map(name => compareEntries(before.get(name), after.get(name), prefix + name)))
  }

  const compareEntries = async (before: TreeEntry | undefined, after: TreeEntry | undefined, path: string) => {
    if (sameEntry(before, after)) return
    const beforeTree = before?.kind === 'tree' ? before.id : undefined
    const afterTree = after?.kind === 'tree' ? after.id : undefined
    if (beforeTree || afterTree) await compareTrees(beforeTree, afterTree, `${path}/`)
    if (before && !beforeTree && (!after || afterTree)) diff.removed.push(path)
    if (after && !afterTree) diff.written.push({ path, entry: after, before: beforeTree ? undefined : before })
  }

  await compareTrees(from, to, '')
  return diff
}

export const checkout = async (synced: SyncedFolder, fromTree: string, toTree: string) => {
  const diff = await diffTrees(synced.store, fromTree, toTree)
  await removeFiles(synced, diff.removed)
  await writeFiles(synced, diff.written)
  return diff.removed.length + diff.written.length
}
