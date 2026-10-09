import type { GrepMatch } from '@sand/files/contract'
import type { FileIndex, Wire } from '../contract'

const freshMs = 15_000

export const createFileIndex = (wire: Wire, cwd: () => string): FileIndex => {
  const cache = new Map<string, { at: number; files: Promise<string[]> }>()
  return {
    list(folder = cwd()) {
      const cached = cache.get(folder)
      if (cached && Date.now() - cached.at < freshMs) return cached.files
      const files = wire.call<string[]>({ type: 'files.list', cwd: folder })
      cache.set(folder, { at: Date.now(), files })
      files.catch(() => cache.delete(folder))
      return files
    },
    grep: (query, folder = cwd()) => wire.call<GrepMatch[]>({ type: 'files.grep', cwd: folder, query }),
  }
}
