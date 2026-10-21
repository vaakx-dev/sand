import type { Request } from '@sand/host-hub/contract'
import { checked, chunkBytes, chunkCount, chunkUrl, eachChunk, fetchChunk, type ChunkedFile, type PcFetch } from './chunks'
import { transfersPull, transfersStatus } from './contract'

type PcCall = <I, O>(request: Request<I, O>, input: I) => Promise<O>

const pollEvery = 500

const sendChunks = async (to: PcFetch, file: ChunkedFile, partOf: (index: number) => Promise<BodyInit>, progress?: (sent: number) => void) => {
  let sent = 0
  await eachChunk(file.chunks, async index => {
    await checked(await to(chunkUrl(file, index), { method: 'POST', body: await partOf(index) }))
    sent++
    progress?.(sent)
  })
}

export const uploadBlob = async (to: PcFetch, blob: Blob, progress?: (bytes: number) => void): Promise<ChunkedFile> => {
  const file = { transfer: crypto.randomUUID(), size: blob.size, chunks: chunkCount(blob.size) }
  const partOf = async (index: number) => blob.slice(index * chunkBytes, (index + 1) * chunkBytes)
  await sendChunks(to, file, partOf, sent => progress?.(Math.min(sent * chunkBytes, blob.size)))
  return file
}

export const relayTransfer = (from: PcFetch, to: PcFetch, file: ChunkedFile, progress?: (sent: number) => void) =>
  sendChunks(to, file, index => fetchChunk(from, file, index), progress)

export const pullTransfer = async (to: PcCall, from: string | undefined, file: ChunkedFile, progress?: (sent: number) => void) => {
  const watch = () => void to(transfersStatus, { transfer: file.transfer }).then(progress, () => undefined)
  const timer = setInterval(watch, pollEvery)
  try {
    await to(transfersPull, { from, transfer: file.transfer, size: file.size, chunks: file.chunks })
  } finally {
    clearInterval(timer)
  }
  progress?.(file.chunks)
}
