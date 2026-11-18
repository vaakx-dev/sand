import { isMissing } from '@sand/util/fs'
import type { Dirent } from 'node:fs'
import { lstat, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const goneAs =
  <T>(empty: T) =>
  (error: unknown) => {
    if (isMissing(error)) return empty
    throw error
  }

const entrySize = (path: string, entry: Dirent) => {
  if (entry.isSymbolicLink()) return 0
  if (entry.isDirectory()) return sizeOf(path)
  return lstat(path).then(stat => stat.size, goneAs(0))
}

const sizeOf = async (folder: string): Promise<number> => {
  const entries = await readdir(folder, { withFileTypes: true }).catch(goneAs<Dirent[]>([]))
  const sizes = await Promise.all(entries.map(entry => entrySize(join(folder, entry.name), entry)))
  return sizes.reduce((total, size) => total + size, 0)
}

self.onmessage = async ({ data: folders }: MessageEvent<string[]>) => {
  for (const folder of folders) postMessage({ folder, size: await sizeOf(folder) })
}
