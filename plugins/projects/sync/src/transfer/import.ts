import type { SyncImported } from '../contract'
import type { SyncedFolder } from '../folder/synced'
import { readPack } from '../store/pack'
import { hasSnapshot, readSnapshot } from '../store/snapshots'
import type { Store } from '../store/store'
import { visitTree } from '../store/visit'
import { verifyPack } from './verify'

const countMissing = async (store: Store, head: string) => {
  if (!(await hasSnapshot(store, head))) return 1
  const { tree } = await readSnapshot(store, head)
  if (!(await store.has(tree))) return 1
  let missing = 0
  await visitTree(store, tree, async entry => {
    if (await store.has(entry.id)) return true
    missing++
    return false
  })
  return missing
}

export const importSnapshot = async (synced: SyncedFolder, pack: string | undefined, commit: string | undefined): Promise<SyncImported> => {
  if (!pack) throw new Error('The transfer had no files')
  const { head, objects } = await readPack(pack)
  if (!head || (commit && commit !== head)) throw new Error('The received snapshot does not match')
  await verifyPack(pack, objects)
  await synced.store.adopt(pack, objects)
  const missing = await countMissing(synced.store, head)
  return { path: synced.folder, commit: head, ...(missing > 0 ? { missing } : {}) }
}
