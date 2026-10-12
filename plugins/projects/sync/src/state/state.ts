import { isFolder } from '@sand/kit/fs'
import type { SyncState } from '../contract'
import { settle } from '../conflicts/settle'
import type { FolderState } from '../folder/state'
import { isGitFolder } from '../folder/stat'
import type { SyncedFolder } from '../folder/synced'
import { lineage } from '../snapshot/lineage'
import { snapshot } from '../snapshot/snapshot'
import { readSnapshot } from '../store/snapshots'
import { treeSizes } from '../store/visit'

const absent = (path: string): SyncState => ({ path, exists: false, git: false, head: null, tree: null, lineage: [], files: 0, bytes: 0, conflicts: [], updated: 0 })

const currentHead = async (synced: SyncedFolder, settled: FolderState) => {
  if (!settled.pending) {
    const { head, scan } = await snapshot(synced)
    return { head, files: scan.files, bytes: scan.bytes }
  }
  if (!settled.head) return undefined
  const { tree } = await readSnapshot(synced.store, settled.head)
  return { head: settled.head, ...(await treeSizes(synced.store, tree)) }
}

export const folderState = async (synced: SyncedFolder): Promise<SyncState> => {
  if (!(await isFolder(synced.folder))) return absent(synced.folder)
  const settled = await settle(synced)
  const git = await isGitFolder(synced.folder)
  const current = await currentHead(synced, settled)
  if (!current) return { ...absent(synced.folder), exists: true, git, conflicts: settled.conflicts }
  const [head, history] = await Promise.all([readSnapshot(synced.store, current.head), lineage(synced.store, current.head)])
  return {
    path: synced.folder,
    exists: true,
    git,
    head: current.head,
    tree: head.tree,
    lineage: history,
    files: current.files,
    bytes: current.bytes,
    conflicts: settled.conflicts,
    updated: head.time,
  }
}
