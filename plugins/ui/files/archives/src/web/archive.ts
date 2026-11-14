import { bytes } from '@sand/util'
import { inflate, isZip } from '@sand/zip'
import type { Entry, Listing } from './entry'
import { MAX_ENTRY_BYTES, MAX_UNPACKED_BYTES, tooBigToUnpack } from './limits'
import { isTar, tarArchive } from './tar'
import { zipArchive } from './zip'

interface Packed {
  name: string
  data: Uint8Array<ArrayBuffer>
  modified: number
}

type Archive = Listing | { kind: 'single'; entry: Entry }

const GZIP_MAGIC = [0x1f, 0x8b]

const isGzip = (data: Uint8Array) => GZIP_MAGIC.every((byte, index) => data[index] === byte)

const unpackedName = (name: string) => name.replace(/\.gz$/i, '') || 'unpacked'

const gzipArchive = async ({ name, data, modified }: Packed): Promise<Archive> => {
  const unpacked = await inflate(data, 'gzip', MAX_UNPACKED_BYTES)
  if (!unpacked) throw new Error(`It unpacks to more than ${bytes(MAX_UNPACKED_BYTES)}, the most the viewer unpacks`)
  if (isTar(unpacked)) return tarArchive(unpacked)
  return { kind: 'single', entry: { path: unpackedName(name), size: unpacked.length, modified, unpack: async () => unpacked } }
}

const readArchive = async (packed: Packed): Promise<Archive> => {
  if (isZip(packed.data)) return zipArchive(packed.data)
  if (isGzip(packed.data)) return gzipArchive(packed)
  if (isTar(packed.data)) return tarArchive(packed.data)
  throw new Error("This isn't a zip, tar or gzip archive")
}

const unpackEntry = async (entry: Entry) => {
  if (entry.size > MAX_ENTRY_BYTES) throw tooBigToUnpack(entry.size)
  return entry.unpack()
}

export { readArchive, unpackEntry, type Archive }
