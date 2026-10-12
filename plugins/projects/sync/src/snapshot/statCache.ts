import { join } from 'node:path'
import type { EntryKind } from '../store/tree'

export interface FileStamp {
  size: number
  mtime: number
  id: string
  kind: EntryKind
}

export type StatCache = Map<string, FileStamp>

type Saved = Record<string, [number, number, string, EntryKind]>

const file = (dir: string) => Bun.file(join(dir, 'stat-cache.json'))

export const readStatCache = async (dir: string): Promise<StatCache> => {
  const saved: Saved = await file(dir)
    .json()
    .catch(() => ({}))
  return new Map(Object.entries(saved).map(([path, [size, mtime, id, kind]]) => [path, { size, mtime, id, kind }]))
}

export const writeStatCache = async (dir: string, cache: StatCache) => {
  const saved: Saved = {}
  for (const [path, { size, mtime, id, kind }] of cache) saved[path] = [size, mtime, id, kind]
  await Bun.write(file(dir), JSON.stringify(saved))
}

const sameStamp = (a: FileStamp | undefined, b: FileStamp) => a?.size === b.size && a.mtime === b.mtime && a.id === b.id && a.kind === b.kind

export const sameCache = (a: StatCache, b: StatCache) => a.size === b.size && [...b].every(([path, stamp]) => sameStamp(a.get(path), stamp))
