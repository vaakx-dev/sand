import { limited } from '@sand/kit'
import type { SyncedFolder } from '../folder/synced'
import { largeBlob } from '../store/encoding'
import type { Store } from '../store/store'
import { emptyTree, readTreeMap, sameEntry, writeTree, type TreeEntry } from '../store/tree'
import { oursContent, storeOurs } from './ours'
import { isText, mergeText } from './text'

interface Merging {
  synced: SyncedFolder
  conflicts: string[]
  readers: ReturnType<typeof limited>
  blobs: ReturnType<typeof limited>
}

const treeIdOf = (entry: TreeEntry | undefined) => (entry?.kind === 'tree' ? entry.id : emptyTree)

const isDirLike = (entry: TreeEntry | undefined) => !entry || entry.kind === 'tree'

const isLarge = (entry: TreeEntry) => entry.size > largeBlob

const baseContent = async (store: Store, base: TreeEntry | undefined) => {
  if (!base || base.kind === 'tree' || !(await store.has(base.id))) return new Uint8Array(0)
  return store.read(base.id)
}

const keepOurs = async (merging: Merging, path: string, ours: TreeEntry | undefined) => {
  merging.conflicts.push(path)
  await storeOurs(merging.synced, path, ours)
  return ours
}

const mergeBlobs = async (merging: Merging, path: string, base: TreeEntry | undefined, ours: TreeEntry, theirs: TreeEntry): Promise<TreeEntry | undefined> => {
  const kind = base?.kind === ours.kind ? theirs.kind : ours.kind
  if (ours.id === theirs.id) return { ...ours, kind }
  if (ours.kind === 'link' || theirs.kind === 'link' || isLarge(ours) || isLarge(theirs)) return keepOurs(merging, path, ours)
  const { store } = merging.synced
  const sides = await Promise.all([baseContent(store, base), oursContent(merging.synced, path, ours), store.read(theirs.id)])
  if (!sides.every(isText)) return keepOurs(merging, path, ours)
  const merged = mergeText(...sides)
  const id = await store.put(merged.bytes)
  if (merged.conflicted) merging.conflicts.push(path)
  return { name: ours.name, kind, id, size: merged.bytes.length }
}

const mergeEntry = async (merging: Merging, name: string, path: string, base?: TreeEntry, ours?: TreeEntry, theirs?: TreeEntry): Promise<TreeEntry | undefined> => {
  if (sameEntry(ours, theirs) || sameEntry(base, theirs)) return ours
  if (sameEntry(base, ours)) return theirs
  if (isDirLike(ours) && isDirLike(theirs)) {
    const id = await mergeDirs(merging, treeIdOf(base), treeIdOf(ours), treeIdOf(theirs), `${path}/`)
    return id === emptyTree ? undefined : { name, kind: 'tree', id, size: 0 }
  }
  if (!ours || !theirs || ours.kind === 'tree' || theirs.kind === 'tree') return keepOurs(merging, path, ours)
  return merging.blobs(() => mergeBlobs(merging, path, base, ours, theirs))
}

const mergeDirs = async (merging: Merging, base: string, ours: string, theirs: string, prefix: string): Promise<string> => {
  if (ours === theirs || base === theirs) return ours
  if (base === ours) return theirs
  const { store } = merging.synced
  const read = (id: string) => merging.readers(() => readTreeMap(store, id))
  const [b, o, t] = await Promise.all([read(base), read(ours), read(theirs)])
  const names = [...new Set([...b.keys(), ...o.keys(), ...t.keys()])]
  const entries = await Promise.all(names.map(name => mergeEntry(merging, name, prefix + name, b.get(name), o.get(name), t.get(name))))
  return writeTree(store, entries.filter(entry => entry !== undefined))
}

export const mergeTrees = async (synced: SyncedFolder, base: string, ours: string, theirs: string) => {
  const merging: Merging = { synced, conflicts: [], readers: limited(32), blobs: limited(16) }
  const tree = await mergeDirs(merging, base, ours, theirs, '')
  return { tree, conflicts: merging.conflicts.sort() }
}
