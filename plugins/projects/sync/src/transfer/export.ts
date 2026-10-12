import type { Transfers } from '@sand/transfers/contract'
import { link } from 'node:fs/promises'
import { requireSettled } from '../conflicts/settle'
import type { SyncExport } from '../contract'
import { readVerified, streamVerified } from '../folder/content'
import type { SyncedFolder } from '../folder/synced'
import { mapLimit } from '../io/pool'
import { snapshot } from '../snapshot/snapshot'
import { encode, largeBlob, streamedBlob } from '../store/encoding'
import type { PackWriter } from '../store/pack'
import { planPack, type PackedBlob, type PackPlan } from './plan'

const smallReads = 64

const bigReads = 4

const isBig = ({ entry }: PackedBlob) => entry.size > largeBlob

const addBlob = async ({ folder, store }: SyncedFolder, writer: PackWriter, { path, entry }: PackedBlob) => {
  if (await store.has(entry.id)) return store.copyInto(writer, entry.id)
  if (entry.size > streamedBlob) return writer.stream(entry.id, streamVerified(folder, path, entry))
  await writer.add(entry.id, await encode(await readVerified(folder, path, entry)))
}

export const packSnapshot = (synced: SyncedFolder, head: string, plan: PackPlan) =>
  synced.store.addPack(async writer => {
    await mapLimit([...plan.snapshots, ...plan.trees], smallReads, id => synced.store.copyInto(writer, id))
    await mapLimit(plan.blobs.filter(blob => !isBig(blob)), smallReads, blob => addBlob(synced, writer, blob))
    await mapLimit(plan.blobs.filter(isBig), bigReads, blob => addBlob(synced, writer, blob))
  }, head)

const offer = async (pack: string, transfers: Transfers) => {
  const file = await transfers.reserve()
  await link(pack, file).catch(() => Bun.write(file, Bun.file(pack)))
  return transfers.offer(file)
}

export const exportSnapshot = async (synced: SyncedFolder, have: string[], transfers: Transfers): Promise<SyncExport> => {
  await requireSettled(synced)
  const { head } = await snapshot(synced)
  const pack = await packSnapshot(synced, head, await planPack(synced.store, head, have))
  return { ...(await offer(pack, transfers)), commit: head }
}
