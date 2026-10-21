import type { Dirent } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { FolderListing } from '../contract'

const isFolderEntry = async (dir: string, entry: Dirent) =>
  entry.isDirectory() || (entry.isSymbolicLink() && Boolean((await stat(join(dir, entry.name)).catch(() => undefined))?.isDirectory()))

const byName = (a: string, b: string) => Number(a.startsWith('.')) - Number(b.startsWith('.')) || a.localeCompare(b, undefined, { sensitivity: 'base' })

export const browse = async (path: string): Promise<FolderListing> => {
  const entries = await readdir(path, { withFileTypes: true }).catch(() => undefined)
  if (!entries) return { path, exists: false, folders: [] }
  const flags = await Promise.all(entries.map(entry => isFolderEntry(path, entry)))
  return { path, exists: true, folders: entries.filter((_, index) => flags[index]).map(entry => entry.name).sort(byName) }
}
