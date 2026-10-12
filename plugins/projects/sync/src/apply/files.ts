import { chmod, lstat, mkdir, rm, rmdir, symlink } from 'node:fs/promises'
import { dirname } from 'node:path'
import { inside } from '../folder/paths'
import type { SyncedFolder } from '../folder/synced'
import { mapLimit } from '../io/pool'
import { readStatCache, writeStatCache, type FileStamp } from '../snapshot/statCache'
import type { Store } from '../store/store'
import type { TreeEntry } from '../store/tree'

export interface FileWrite {
  path: string
  entry: TreeEntry
  before?: TreeEntry
}

const writers = 32

const isPosix = process.platform !== 'win32'

const ancestors = (folder: string, target: string) => {
  const found: string[] = []
  for (let dir = dirname(target); dir !== folder && dir.startsWith(folder); dir = dirname(dir)) found.push(dir)
  return found
}

const pruneEmpty = async (folder: string, targets: string[]) => {
  const dirs = [...new Set(targets.flatMap(target => ancestors(folder, target)))].sort((a, b) => b.length - a.length)
  for (const dir of dirs) await rmdir(dir).catch(() => {})
}

export const removeFiles = async (synced: SyncedFolder, paths: string[]) => {
  const targets = paths.flatMap(path => inside(synced.folder, path) ?? [])
  await mapLimit(targets, writers, target => rm(target, { force: true }))
  await pruneEmpty(synced.folder, targets)
}

type Stamped = [string, FileStamp] | undefined

const stampOf = async (path: string, target: string, entry: TreeEntry): Promise<Stamped> => {
  const info = await lstat(target)
  return [path, { size: info.size, mtime: info.mtimeMs, id: entry.id, kind: entry.kind }]
}

const writeLink = async (store: Store, path: string, entry: TreeEntry, target: string) => {
  const pointsTo = new TextDecoder().decode(await store.read(entry.id))
  await rm(target, { force: true })
  const linked = await symlink(pointsTo, target).then(
    () => true,
    () => false,
  )
  if (linked) return undefined
  await Bun.write(target, pointsTo)
  return stampOf(path, target, entry)
}

const writeOne = async (synced: SyncedFolder, { path, entry, before }: FileWrite): Promise<Stamped> => {
  const target = inside(synced.folder, path)
  if (!target) return undefined
  if (entry.kind === 'link') return writeLink(synced.store, path, entry, target)
  if (before?.kind === 'link') await rm(target, { force: true })
  await synced.store.writeTo(entry.id, target)
  if (isPosix && (entry.kind === 'exec' || before?.kind === 'exec')) await chmod(target, entry.kind === 'exec' ? 0o755 : 0o644)
  return stampOf(path, target, entry)
}

const recordStamps = async (synced: SyncedFolder, stamps: [string, FileStamp][]) => {
  if (stamps.length === 0) return
  const cache = await readStatCache(synced.dir)
  for (const [path, stamp] of stamps) cache.set(path, stamp)
  await writeStatCache(synced.dir, cache)
}

export const writeFiles = async (synced: SyncedFolder, files: FileWrite[]) => {
  const dirs = [...new Set(files.flatMap(({ path }) => inside(synced.folder, path) ?? []).map(target => dirname(target)))]
  await mapLimit(dirs, writers, dir => mkdir(dir, { recursive: true }))
  const stamps = await mapLimit(files, writers, file => writeOne(synced, file))
  await recordStamps(
    synced,
    stamps.filter(stamp => stamp !== undefined),
  )
}
