import { isFolder } from '@sand/kit/fs'
import type { SyncPick, SyncResolved } from '../contract'
import { join } from 'node:path'
import { removeFiles, writeFiles } from '../apply/files'
import { writeState } from '../folder/state'
import type { SyncedFolder } from '../folder/synced'
import { readSnapshot } from '../store/snapshots'
import type { Store } from '../store/store'
import { readTreeMap, type TreeEntry } from '../store/tree'
import { treeFiles } from '../store/visit'
import { remaining } from './remaining'
import { finalise, settle } from './settle'

const entryAt = async (store: Store, tree: string, path: string) => {
  let current: TreeEntry | undefined = { name: '', kind: 'tree', id: tree, size: 0 }
  for (const name of path.split('/')) {
    if (current?.kind !== 'tree') return undefined
    current = (await readTreeMap(store, current.id)).get(name)
  }
  return current
}

const pickPath = async (synced: SyncedFolder, tree: string, path: string) => {
  const entry = await entryAt(synced.store, tree, path)
  if (!entry) return removeFiles(synced, [path])
  if (entry.kind !== 'tree') return writeFiles(synced, [{ path, entry }])
  if (!(await isFolder(join(synced.folder, path)))) await removeFiles(synced, [path])
  await writeFiles(synced, await treeFiles(synced.store, entry.id, `${path}/`))
}

const pickFiles = async (synced: SyncedFolder, snapshot: string, paths: string[]) => {
  const { tree } = await readSnapshot(synced.store, snapshot)
  for (const path of paths) await pickPath(synced, tree, path)
}

export const resolveConflicts = async (synced: SyncedFolder, picks: Record<string, SyncPick>): Promise<SyncResolved> => {
  const settled = await settle(synced)
  if (!settled.pending || !settled.ours) return { head: settled.head, remaining: [] }
  const chosen = Object.entries(picks).filter(([path, pick]) => settled.conflicts.includes(path) && (pick === 'ours' || pick === 'theirs'))
  const picking = (side: SyncPick) => chosen.filter(([, pick]) => pick === side).map(([path]) => path)
  await pickFiles(synced, settled.ours, picking('ours'))
  await pickFiles(synced, settled.pending, picking('theirs'))
  const picked = new Set(chosen.map(([path]) => path))
  const unmarked = Object.fromEntries(Object.entries(settled.unmarked).filter(([path]) => !picked.has(path)))
  const state = { ...settled, conflicts: settled.conflicts.filter(path => !picked.has(path)), unmarked }
  await writeState(synced, state)
  const open = await remaining(synced, state)
  if (open.length === 0) return { head: await finalise(synced, state), remaining: [] }
  await writeState(synced, { ...state, conflicts: open })
  return { head: state.head, remaining: open }
}
