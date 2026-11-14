import { crc32 } from './crc'
import { entriesOf, type Located } from './directory'
import { inflate } from './inflate'
import { damaged, LIMITS, tooLarge, tooMuch, type ZipLimits } from './limits'

interface ZipEntry {
  name: string
  size: number
  modified: number
}

const ENCRYPTED = 0x1
const STORED = 0
const DEFLATED = 8

const contentOf = async (data: Uint8Array<ArrayBuffer>, entry: Located) => {
  if (entry.flags & ENCRYPTED) throw new Error(`${entry.name} is encrypted`)
  const packed = data.subarray(entry.start, entry.start + entry.packed)
  if (entry.method === STORED) return packed.slice()
  if (entry.method === DEFLATED) return inflate(packed, 'deflate-raw', entry.size)
  throw new Error(`${entry.name} is packed with a method that can't be unpacked (${entry.method})`)
}

const unpacked = async (data: Uint8Array<ArrayBuffer>, entry: Located) => {
  const content = await contentOf(data, entry)
  if (content?.length !== entry.size) throw damaged(`${entry.name} doesn't unpack to the size it declares`)
  if (crc32(content) !== entry.crc) throw damaged(`${entry.name} failed its checksum`)
  return content
}

class Zip {
  readonly entries: ZipEntry[]
  readonly #data: Uint8Array<ArrayBuffer>
  readonly #limits: ZipLimits
  readonly #byName: Map<string, Located>
  readonly #counted = new Set<string>()
  #unpackedBytes = 0

  constructor(data: Uint8Array<ArrayBuffer>, limits: Partial<ZipLimits> = {}) {
    this.#data = data
    this.#limits = { ...LIMITS, ...limits }
    const located = entriesOf(data, this.#limits.entries)
    this.#byName = new Map(located.map(entry => [entry.name, entry]))
    this.entries = located.map(({ name, size, modified }) => ({ name, size, modified }))
  }

  has(name: string) {
    return this.#byName.has(name)
  }

  async bytes(name: string) {
    const entry = this.#byName.get(name)
    if (!entry) throw new Error(`${name} is missing`)
    this.#reserve(entry)
    return unpacked(this.#data, entry)
  }

  async text(name: string) {
    return new TextDecoder().decode(await this.bytes(name))
  }

  #reserve(entry: Located) {
    if (entry.size > this.#limits.entryBytes) throw tooLarge(entry.name, entry.size, this.#limits.entryBytes)
    if (this.#counted.has(entry.name)) return
    if (this.#unpackedBytes + entry.size > this.#limits.totalBytes) throw tooMuch(this.#limits.totalBytes)
    this.#unpackedBytes += entry.size
    this.#counted.add(entry.name)
  }
}

export { Zip, type ZipEntry }
