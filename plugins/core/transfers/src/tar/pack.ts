import { type FileHandle, lstat, open, readdir, readlink } from 'node:fs/promises'
import { join } from 'node:path'
import { block, type Entry, headersOf, padding } from './header'

const entryOf = async (root: string, rel: string): Promise<Entry | undefined> => {
  const path = join(root, rel)
  const info = await lstat(path).catch(() => undefined)
  if (!info) return undefined
  const base = { name: rel.replaceAll('\\', '/'), mode: info.mode & 0o7777, mtime: Math.floor(info.mtimeMs / 1000), size: 0, link: '' }
  if (info.isSymbolicLink()) return { ...base, type: 'link', link: await readlink(path) }
  if (info.isDirectory()) return { ...base, type: 'folder' }
  if (info.isFile()) return { ...base, type: 'file', size: info.size }
  return undefined
}

async function* entriesAt(root: string, rel: string): AsyncGenerator<Entry> {
  const entry = await entryOf(root, rel)
  if (!entry) return
  yield entry
  if (entry.type !== 'folder') return
  for (const name of (await readdir(join(root, rel))).sort()) yield* entriesAt(root, join(rel, name))
}

const copyInto = async (out: FileHandle, path: string, size: number) => {
  let left = size
  for await (const chunk of Bun.file(path).stream()) {
    const part = chunk.subarray(0, left)
    await out.write(part)
    left -= part.length
    if (!left) break
  }
  await out.write(new Uint8Array(left + padding(size)))
}

export const pack = async (root: string, paths: string[] | undefined, into: string) => {
  const out = await open(into, 'w')
  const seen = new Set<string>()
  try {
    for (const rel of paths ?? (await readdir(root)).sort())
      for await (const entry of entriesAt(root, rel)) {
        if (seen.has(entry.name)) continue
        seen.add(entry.name)
        for (const header of headersOf(entry)) await out.write(header)
        if (entry.type === 'file') await copyInto(out, join(root, entry.name), entry.size)
      }
    await out.write(new Uint8Array(block * 2))
  } finally {
    await out.close()
  }
}
