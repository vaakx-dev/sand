import { pathKey } from '@sand/git/contract'
import { lstat, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const sizeOf = async (folder: string): Promise<number> => {
  const entries = await readdir(folder, { withFileTypes: true }).catch(() => [])
  const sizes = await Promise.all(
    entries.map(entry => {
      const path = join(folder, entry.name)
      if (entry.isSymbolicLink()) return 0
      if (entry.isDirectory()) return sizeOf(path)
      return lstat(path).then(
        stat => stat.size,
        () => 0,
      )
    }),
  )
  return sizes.reduce((total, size) => total + size, 0)
}

export const createSizes = () => {
  const known = new Map<string, number>()
  const counting = new Map<string, Promise<number>>()

  const count = (folder: string) => {
    const key = pathKey(folder)
    const pending = counting.get(key)
    if (pending) return pending
    const next = sizeOf(folder)
      .then(size => {
        known.set(key, size)
        return size
      })
      .finally(() => counting.delete(key))
    counting.set(key, next)
    return next
  }

  return {
    known: (folder: string) => known.get(pathKey(folder)),
    async count(folders: string[]) {
      const sizes: Record<string, number> = {}
      for (const folder of folders) sizes[folder] = await count(folder)
      return sizes
    },
  }
}

export type Sizes = ReturnType<typeof createSizes>
