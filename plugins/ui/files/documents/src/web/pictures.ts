import { extensionOf } from '@sand/file-viewer/contract'
import { errorMessage, imageDimensions } from '@sand/util'
import type { Zip } from '@sand/zip'

type Picture = { kind: 'shown'; src: string } | { kind: 'unshown'; note: string }

type Shown = Map<string, Picture>

const MAX_PIXELS = 16_777_216
const MAX_PICTURES = 400

const TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' }

const problem = (data: Uint8Array, type: string) => {
  if (type === TYPES.svg) return undefined
  const size = imageDimensions(data)
  if (!size) return "image whose size couldn't be read"
  if (size.width * size.height > MAX_PIXELS) return `${size.width} × ${size.height} image, too large to show`
  return undefined
}

class Pictures {
  #zip: Zip
  #loaded = new Map<string, Promise<Picture>>()
  #urls: string[] = []

  constructor(zip: Zip) {
    this.#zip = zip
  }

  async load(paths: string[]): Promise<Shown> {
    const unique = [...new Set(paths)]
    const pictures = await Promise.all(unique.map(path => this.#picture(path)))
    return new Map(unique.map((path, index) => [path, pictures[index]!]))
  }

  revoke() {
    this.#urls.forEach(url => URL.revokeObjectURL(url))
    this.#urls = []
    this.#loaded.clear()
  }

  #picture(path: string) {
    const known = this.#loaded.get(path)
    if (known) return known
    const loading = this.#read(path).catch((error: unknown): Picture => ({ kind: 'unshown', note: errorMessage(error) }))
    this.#loaded.set(path, loading)
    return loading
  }

  async #read(path: string): Promise<Picture> {
    const type = TYPES[extensionOf(path)]
    if (!type || !this.#zip.has(path)) return { kind: 'unshown', note: 'missing image' }
    if (this.#loaded.size > MAX_PICTURES) return { kind: 'unshown', note: 'image not shown, this document has too many' }
    const data = await this.#zip.bytes(path)
    const note = problem(data, type)
    if (note) return { kind: 'unshown', note }
    const src = URL.createObjectURL(new Blob([data], { type }))
    this.#urls.push(src)
    return { kind: 'shown', src }
  }
}

export { Pictures, type Picture, type Shown }
