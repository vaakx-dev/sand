import { bearer, fetchHostIdentity } from '@sand/kit'
import { remoteStore, remoteUrls } from '@sand/kit/host'
import type { RemoteRecord } from '@sand/protocol'
import { eachChunk, fetchChunk, type ChunkedFile, type PcFetch } from '@sand/kit/transfers'
import type { TransferStore } from './transfers'

const identityTimeout = 3000

const reachableUrl = async (record: RemoteRecord) => {
  for (const url of remoteUrls(record)) {
    const identity = await fetchHostIdentity(url, identityTimeout).catch(() => undefined)
    if (identity?.deviceId === record.id) return url
  }
  throw new Error(`${record.name} is not reachable from this PC`)
}

const fetchFromPc = async (home: string, pc: string): Promise<PcFetch> => {
  const record = (await remoteStore(home)).get(pc)
  if (!record) throw new Error('This PC is not paired with the PC that has the files')
  const url = await reachableUrl(record)
  return (path, init) => fetch(new URL(path, url), { ...init, headers: bearer(record.key) })
}

export const pullFrom =
  (home: string, transfers: TransferStore) =>
  async ({ from, transfer, size, chunks }: ChunkedFile & { from?: string }) => {
    const file = { transfer, size, chunks }
    const source = from && (await fetchFromPc(home, from))
    const read = (index: number) => (source ? fetchChunk(source, file, index) : transfers.read(transfer, index).bytes())
    await eachChunk(chunks, async index => transfers.write(file, index, await read(index)))
  }
