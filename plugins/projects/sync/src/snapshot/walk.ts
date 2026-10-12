import type { Dirent, Stats } from 'node:fs'
import { lstat, readdir, readlink } from 'node:fs/promises'
import { join } from 'node:path'
import { errorMessage, limited } from '@sand/kit'
import { isMissing } from '@sand/kit/fs'
import { isAlwaysSkipped } from '../ignore/builtin'
import { isIgnored, rootRules, withIgnoreFile, type IgnoreRules } from '../ignore/rules'
import { hashBlob, hashOf, largeBlob } from '../store/encoding'
import type { Store } from '../store/store'
import { emptyTree, writeTree, type EntryKind, type TreeEntry } from '../store/tree'
import type { FileStamp, StatCache } from './statCache'

export interface Scan {
  tree: string
  files: number
  bytes: number
  skipped: string[]
}

interface Walk {
  folder: string
  store: Store
  previous: StatCache
  stamps: StatCache
  run: ReturnType<typeof limited>
  bigReads: ReturnType<typeof limited>
  files: number
  bytes: number
  skipped: string[]
}

const settleTime = 2000

const absoluteOf = (walk: Walk, path: string) => (path ? `${walk.folder}/${path}` : walk.folder)

const goneOr = (path: string) => (error: unknown) => {
  if (isMissing(error)) return undefined
  throw new Error(`Couldn't read ${path || 'the folder'}: ${errorMessage(error)}`)
}

const fileKind = (previous: FileStamp | undefined, info: Stats): EntryKind => {
  if (process.platform === 'win32') return previous?.kind ?? 'file'
  return info.mode & 0o100 ? 'exec' : 'file'
}

const isFresh = (previous: FileStamp, info: Stats) => previous.size === info.size && previous.mtime === info.mtimeMs

const count = (walk: Walk, entry: TreeEntry) => {
  walk.files++
  walk.bytes += entry.size
  return entry
}

const hashFile = (walk: Walk, absolute: string, size: number) => {
  const run = size > largeBlob ? walk.bigReads : walk.run
  return run(() => hashBlob(Bun.file(absolute)))
}

const hashedStamp = async (walk: Walk, absolute: string, previous: FileStamp | undefined, info: Stats): Promise<FileStamp | undefined> => {
  const kind = fileKind(previous, info)
  const id = await hashFile(walk, absolute, info.size).catch(() => undefined)
  if (id) return { size: info.size, mtime: Date.now() - info.mtimeMs > settleTime ? info.mtimeMs : -1, id, kind }
  return previous ? { ...previous, mtime: -1 } : undefined
}

const fileEntry = async (walk: Walk, path: string, name: string): Promise<TreeEntry | undefined> => {
  const absolute = absoluteOf(walk, path)
  const info = await lstat(absolute).catch(goneOr(path))
  if (!info) return undefined
  const previous = walk.previous.get(path)
  const stamp = previous && isFresh(previous, info) ? { ...previous, kind: fileKind(previous, info) } : await hashedStamp(walk, absolute, previous, info)
  if (!stamp) return undefined
  walk.stamps.set(path, stamp)
  return count(walk, { name, kind: stamp.kind, id: stamp.id, size: stamp.size })
}

const linkEntry = async (walk: Walk, path: string, name: string): Promise<TreeEntry | undefined> => {
  const target = await walk.run(() => readlink(absoluteOf(walk, path))).catch(goneOr(path))
  if (target === undefined) return undefined
  const bytes = new TextEncoder().encode(target)
  return count(walk, { name, kind: 'link', id: hashOf(bytes), size: bytes.length })
}

const entryOf = async (walk: Walk, parent: string, dirent: Dirent, rules: IgnoreRules): Promise<TreeEntry | undefined> => {
  const { name } = dirent
  const path = parent ? `${parent}/${name}` : name
  if (isAlwaysSkipped(name)) return undefined
  const isDir = dirent.isDirectory()
  if (isIgnored(rules, path, name, isDir)) {
    if (!parent) walk.skipped.push(name)
    return undefined
  }
  if (isDir) {
    const id = await walkDir(walk, path, rules)
    return id === undefined ? undefined : { name, kind: 'tree', id, size: 0 }
  }
  if (dirent.isSymbolicLink()) return linkEntry(walk, path, name)
  if (dirent.isFile()) return fileEntry(walk, path, name)
  return undefined
}

const walkDir = async (walk: Walk, path: string, inherited: IgnoreRules): Promise<string | undefined> => {
  const absolute = absoluteOf(walk, path)
  const dirents = (await walk.run(() => readdir(absolute, { withFileTypes: true })).catch(goneOr(path))) ?? []
  const hasIgnoreFile = dirents.some(dirent => dirent.name === '.gitignore' && dirent.isFile())
  const rules = hasIgnoreFile ? await withIgnoreFile(inherited, path ? `${path}/` : '', join(absolute, '.gitignore')) : inherited
  const found = await Promise.all(dirents.map(dirent => entryOf(walk, path, dirent, rules)))
  const entries = found.filter(entry => entry !== undefined)
  if (path && entries.length === 0) return undefined
  return writeTree(walk.store, entries)
}

export const walkFolder = async (folder: string, store: Store, previous: StatCache) => {
  const walk: Walk = { folder, store, previous, stamps: new Map(), run: limited(32), bigReads: limited(4), files: 0, bytes: 0, skipped: [] }
  const tree = (await walkDir(walk, '', await rootRules(folder))) ?? emptyTree
  const scan: Scan = { tree, files: walk.files, bytes: walk.bytes, skipped: walk.skipped }
  return { scan, stamps: walk.stamps }
}
