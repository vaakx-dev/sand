import type { OpenFile } from '@sand/file-viewer/contract'
import { bytes } from '@sand/util'
import { storedZip, Zip } from '@sand/zip'

const MAX_FILE_BYTES = 100 * 1024 * 1024

const partKey = (name: string) => name.replace(/^\/+/, '').toLowerCase()

class Archive {
  readonly #zip: Zip
  readonly #names: Map<string, string>
  readonly #parts = new Map<string, Promise<Uint8Array<ArrayBuffer>>>()

  constructor(zip: Zip) {
    this.#zip = zip
    this.#names = new Map(zip.entries.map(entry => [partKey(entry.name), entry.name]))
  }

  has(name: string) {
    return this.#names.has(partKey(name))
  }

  bytes(name: string) {
    const key = partKey(name)
    const part = this.#parts.get(key) ?? this.#zip.bytes(this.#names.get(key) ?? name)
    this.#parts.set(key, part)
    return part
  }

  async text(name: string) {
    return new TextDecoder().decode(await this.bytes(name))
  }

  async repack() {
    const names = [...this.#names.values()]
    const parts = await Promise.all(names.map(name => this.bytes(name)))
    return storedZip(names.map((name, index) => [name, parts[index]!]))
  }
}

const openArchive = async (file: OpenFile) => {
  if (file.size > MAX_FILE_BYTES) throw new Error(`it's ${bytes(file.size)}, and the viewer opens Office files up to ${bytes(MAX_FILE_BYTES)}`)
  return new Archive(new Zip(await file.bytes()))
}

export { Archive, openArchive }
