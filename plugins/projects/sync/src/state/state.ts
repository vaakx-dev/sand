import type { SyncState } from '../contract'
import { settle } from '../conflicts/settle'
import { hiddenLine, hiddenOut, type Hidden } from '../folder/hidden'
import { isDirectory, isGitFolder } from '../folder/stat'
import { snapshot } from '../snapshot/snapshot'
import { treeOf } from '../snapshot/tree'
import { treeSizes } from './sizes'

const absent = (path: string): SyncState => ({ path, exists: false, git: false, head: null, tree: null, lineage: [], files: 0, bytes: 0, conflicts: [], updated: 0 })

export const folderState = async (hidden: Hidden): Promise<SyncState> => {
  if (!(await isDirectory(hidden.folder))) return absent(hidden.folder)
  const settled = await settle(hidden)
  const head = settled.pending ? settled.head : await snapshot(hidden)
  const git = await isGitFolder(hidden.folder)
  if (!head) return { ...absent(hidden.folder), exists: true, git, conflicts: settled.conflicts }
  const tree = await treeOf(hidden, head)
  const [lineage, listing, time] = await Promise.all([
    hiddenOut(hidden, ['rev-list', '-n', '100', head]),
    hiddenOut(hidden, ['ls-tree', '-r', '-l', '-z', tree]),
    hiddenLine(hidden, ['show', '-s', '--format=%ct', head]),
  ])
  return {
    path: hidden.folder,
    exists: true,
    git,
    head,
    tree,
    lineage: lineage.split('\n').filter(Boolean),
    ...treeSizes(listing),
    conflicts: settled.conflicts,
    updated: Number(time) * 1000,
  }
}
