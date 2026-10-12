import { readState, writeHead } from '../folder/state'
import type { SyncedFolder } from '../folder/synced'
import { readSnapshot, writeSnapshot } from '../store/snapshots'
import { readStatCache, sameCache, writeStatCache } from './statCache'
import { walkFolder } from './walk'

export const scanFolder = async (synced: SyncedFolder) => {
  const previous = await readStatCache(synced.dir)
  const { scan, stamps } = await walkFolder(synced.folder, synced.store, previous)
  if (!sameCache(previous, stamps)) await writeStatCache(synced.dir, stamps)
  return scan
}

const headTree = (synced: SyncedFolder, head: string) =>
  readSnapshot(synced.store, head).then(
    found => found.tree,
    () => undefined,
  )

export const snapshot = async (synced: SyncedFolder) => {
  const scan = await scanFolder(synced)
  const state = await readState(synced)
  if (state.head && !state.pending && (await headTree(synced, state.head)) === scan.tree) return { head: state.head, scan }
  const head = await writeSnapshot(synced.store, scan.tree, [state.head, state.pending])
  await writeHead(synced, head)
  return { head, scan }
}
