import { readlink } from 'node:fs/promises'
import { join } from 'node:path'
import { digestOf } from '../store/encoding'
import type { TreeEntry } from '../store/tree'

const changed = (path: string) => new Error(`${path} changed during the sync. Try again.`)

const readSource = async (file: string, entry: TreeEntry) => {
  if (entry.kind === 'link') return new TextEncoder().encode(await readlink(file))
  return Bun.file(file).bytes()
}

export const readVerified = async (folder: string, path: string, entry: TreeEntry) => {
  const content = await readSource(join(folder, path), entry).catch(() => undefined)
  if (!content || (await digestOf(content)) !== entry.id) throw changed(path)
  return content
}

export async function* streamVerified(folder: string, path: string, entry: TreeEntry) {
  const hasher = new Bun.CryptoHasher('sha256')
  let size = 0
  for await (const chunk of Bun.file(join(folder, path)).stream()) {
    hasher.update(chunk)
    size += chunk.length
    yield chunk
  }
  if (size !== entry.size || hasher.digest('hex') !== entry.id) throw changed(path)
}
