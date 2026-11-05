import type { ContextRecord } from '@sand/chats/contract'
import { uuid } from '@sand/util'
import type { FileIndex, Threads } from '@sand/web-client/contract'
import type { Trigger, TriggerItem } from '../contract'
import { rank } from './rank'

export interface FileEntry {
  path: string
  directory: boolean
}

interface FileItem extends TriggerItem {
  entry: FileEntry
}

const expanded = new WeakMap<string[], FileEntry[]>()

const withDirectories = (files: string[]): FileEntry[] => {
  const cached = expanded.get(files)
  if (cached) return cached
  const directories = new Set<string>()
  for (const file of files) {
    for (let slash = file.indexOf('/'); slash !== -1; slash = file.indexOf('/', slash + 1)) directories.add(file.slice(0, slash + 1))
  }
  const entries = [...[...directories].map(path => ({ path, directory: true })), ...files.map(path => ({ path, directory: false }))]
  expanded.set(files, entries)
  return entries
}

const fileRecord = (path: string): ContextRecord => ({ v: 1, id: uuid(), kind: 'file', label: path.slice(path.lastIndexOf('/') + 1), data: { path } })

const browse = (path: string) => (/\s/.test(path) ? `@"${path}` : `@${path}`)

export const fileTrigger = (index: FileIndex, threads: Threads): Trigger<FileItem> => ({
  char: '@',
  label: 'files',
  async items(query) {
    const files = await index.list(threads.cwd())
    return rank(withDirectories(files), query.replaceAll('\\', '/')).map((entry): FileItem => ({ label: entry.path, icon: entry.directory ? 'folder' : 'file', partial: entry.directory, entry }))
  },
  accept: ({ entry }) => (entry.directory ? browse(entry.path) : fileRecord(entry.path)),
})
