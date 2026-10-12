import { serial } from '@sand/kit'
import { rm } from 'node:fs/promises'
import { createSink } from '../io/sink'
import type { Encoded } from './encoding'

export interface PackedObject {
  id: string
  offset: number
  length: number
  compressed: boolean
}

interface PackIndex {
  head?: string
  objects: PackedObject[]
}

export interface PackWriter {
  add(id: string, encoded: Encoded): Promise<void>
  stream(id: string, chunks: AsyncIterable<Uint8Array> | Iterable<Uint8Array>, compressed?: boolean): Promise<void>
}

const magic = 'SANDPACK2'

const trailerSize = 4 + magic.length

const trailerOf = (indexLength: number) => {
  const bytes = new Uint8Array(trailerSize)
  new DataView(bytes.buffer).setUint32(0, indexLength, true)
  bytes.set(new TextEncoder().encode(magic), 4)
  return bytes
}

export const readPack = async (file: string): Promise<PackIndex> => {
  const pack = Bun.file(file)
  const end = pack.size - trailerSize
  const trailer = await pack.slice(Math.max(end, 0)).bytes()
  if (end < 0 || new TextDecoder().decode(trailer.subarray(4)) !== magic) throw new Error('The transfer is not a sand sync pack')
  const start = end - new DataView(trailer.buffer, trailer.byteOffset).getUint32(0, true)
  return JSON.parse(Bun.zstdDecompressSync(await pack.slice(start, end).bytes()).toString())
}

export const writePack = async (file: string, fill: (writer: PackWriter) => Promise<void>, head?: string): Promise<PackIndex> => {
  const sink = await createSink(file)
  const index: PackIndex = { head, objects: [] }
  const oneAtATime = serial()

  const stream: PackWriter['stream'] = (id, chunks, compressed = false) =>
    oneAtATime(async () => {
      const offset = sink.written
      await sink.copy(chunks)
      index.objects.push({ id, offset, length: sink.written - offset, compressed })
    })

  try {
    await fill({ stream, add: (id, { bytes, compressed }) => stream(id, [bytes], compressed) })
    const saved = Bun.zstdCompressSync(JSON.stringify(index))
    await sink.copy([saved, trailerOf(saved.length)])
  } catch (error) {
    await sink.end()
    await rm(file, { force: true })
    throw error
  }
  await sink.end()
  return index
}
