import { fileIndex } from '@sand/web-client/contract'
import type { ComposerContext } from '../context'
import type { CompletionSource } from './model'
import { rank } from './rank'

export interface FileEntry {
  path: string
  directory: boolean
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

const quote = (entry: FileEntry, quoted: boolean) => {
  if (!quoted && !/\s/.test(entry.path)) return entry.path
  return entry.directory ? `"${entry.path}` : `"${entry.path}"`
}

export const fileSource = (ctx: ComposerContext): CompletionSource => ({
  trigger: '@',
  label: 'files',
  ready: () => Boolean(ctx.get(fileIndex)),
  pattern: /(?:^|\s)@("[^"]*|[^\s"]*)$/,
  async items(typed) {
    const index = ctx.get(fileIndex)
    if (!index) return []
    const quoted = typed.startsWith('"')
    const query = (quoted ? typed.slice(1) : typed).replaceAll('\\', '/')
    const files = await index.list(ctx.threads.cwd()).catch(() => [])
    return rank(withDirectories(files), query)
      .slice(0, 10)
      .map(entry => ({ value: quote(entry, quoted), group: 'Files', icon: entry.directory ? 'folder' : 'file', ...(entry.directory && { partial: true }) }))
  },
  hint: () => (ctx.get(fileIndex) ? 'No matching files.' : undefined),
})
