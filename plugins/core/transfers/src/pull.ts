import type { Peers } from '@sand/devices-contract'
import { eachChunk, fetchChunk, type ChunkedFile, type PcFetch } from './chunks'
import type { TransferStore } from './transfers'

const fetchFromPc = (peers: Peers | undefined, pc: string): PcFetch => {
  if (!peers?.get(pc)) throw new Error("The PC that has the files isn't one of your PCs")
  return (path, init) => peers.fetch(pc, path, init)
}

export const pullFrom =
  (transfers: TransferStore, peers: () => Peers | undefined) =>
  async ({ from, transfer, size, chunks }: ChunkedFile & { from?: string }) => {
    const file = { transfer, size, chunks }
    const source = from ? fetchFromPc(peers(), from) : undefined
    const read = (index: number) => (source ? fetchChunk(source, file, index) : transfers.read(transfer, index).bytes())
    await eachChunk(chunks, async index => transfers.write(file, index, await read(index)))
  }
