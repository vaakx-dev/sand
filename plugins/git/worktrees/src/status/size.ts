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

export const sizeOf = async (folder: string): Promise<number> => {
  const entries = await readdir(folder, { withFileTypes: true }).catch(goneAs<Dirent[]>([]))
  const sizes = await Promise.all(
    entries.map(entry => {
      const path = join(folder, entry.name)
      if (entry.isSymbolicLink()) return 0
      if (entry.isDirectory()) return sizeOf(path)
      return lstat(path).then(stat => stat.size, goneAs(0))
    }),
  )
  return sizes.reduce((total, size) => total + size, 0)
}
