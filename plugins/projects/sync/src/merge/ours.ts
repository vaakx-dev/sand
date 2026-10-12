import { readVerified, streamVerified } from '../folder/content'
import type { SyncedFolder } from '../folder/synced'
import { mapLimit } from '../io/pool'
import { largeBlob } from '../store/encoding'
import type { TreeEntry } from '../store/tree'
import { treeFiles } from '../store/visit'

export const oursContent = async ({ folder, store }: SyncedFolder, path: string, entry: TreeEntry) => {
  if (await store.has(entry.id)) return store.read(entry.id)
  const content = await readVerified(folder, path, entry)
  await store.put(content)
  return content
}

const storeFile = async ({ folder, store }: SyncedFolder, path: string, entry: TreeEntry) => {
  if (await store.has(entry.id)) return
  if (entry.size > largeBlob) await store.addPack(writer => writer.stream(entry.id, streamVerified(folder, path, entry)))
  else await store.put(await readVerified(folder, path, entry))
}

export const storeOurs = async (synced: SyncedFolder, path: string, entry: TreeEntry | undefined) => {
  if (!entry) return
  const files = entry.kind === 'tree' ? await treeFiles(synced.store, entry.id, `${path}/`) : [{ path, entry }]
  await mapLimit(files, 16, file => storeFile(synced, file.path, file.entry))
}
