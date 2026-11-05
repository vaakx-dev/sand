import { uuid } from '@sand/util'
import { checked, chunkBytes, chunkCount, chunkUrl, eachChunk, type ChunkedFile, type PcFetch } from './chunks'

const sendChunks = async (to: PcFetch, file: ChunkedFile, partOf: (index: number) => Promise<BodyInit>, progress?: (sent: number) => void) => {
  let sent = 0
  await eachChunk(file.chunks, async index => {
    await checked(await to(chunkUrl(file, index), { method: 'POST', body: await partOf(index) }))
    sent++
    progress?.(sent)
  })
}

export const uploadBlob = async (to: PcFetch, blob: Blob, progress?: (bytes: number) => void): Promise<ChunkedFile> => {
  const file = { transfer: uuid(), size: blob.size, chunks: chunkCount(blob.size) }
  const partOf = async (index: number) => blob.slice(index * chunkBytes, (index + 1) * chunkBytes)
  await sendChunks(to, file, partOf, sent => progress?.(Math.min(sent * chunkBytes, blob.size)))
  return file
}
