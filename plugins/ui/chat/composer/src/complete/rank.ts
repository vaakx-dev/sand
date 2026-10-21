import type { FileEntry } from './files'

const tier = 100_000

const score = (query: string, path: string) => {
  const target = path.toLowerCase()
  const name = target.slice(target.lastIndexOf('/', target.length - 2) + 1)
  if (target.startsWith(query)) return 4 * tier - target.length
  if (name.startsWith(query)) return 3 * tier - target.length
  const at = target.indexOf(query)
  if (at !== -1) return 2 * tier - at - target.length
  let index = -1
  let gaps = 0
  for (const char of query) {
    const next = target.indexOf(char, index + 1)
    if (next === -1) return undefined
    gaps += next - index - 1
    index = next
  }
  return tier - gaps * 10 - target.length
}

const depth = (path: string) => path.replace(/\/$/, '').split('/').length

const children = (entries: FileEntry[], dir: string) =>
  entries.filter(entry => entry.path !== dir && entry.path.startsWith(dir) && depth(entry.path) === depth(dir) + 1)

const byName = (a: FileEntry, b: FileEntry) => Number(b.directory) - Number(a.directory) || a.path.localeCompare(b.path)

export const rank = (entries: FileEntry[], query: string) => {
  if (!query) return entries.filter(entry => depth(entry.path) === 1).sort(byName)
  if (query.endsWith('/') && entries.some(entry => entry.path === query)) return children(entries, query).sort(byName)
  const lower = query.toLowerCase()
  return entries
    .flatMap(entry => {
      const value = score(lower, entry.path)
      return value === undefined ? [] : [{ entry, value }]
    })
    .sort((a, b) => b.value - a.value)
    .map(({ entry }) => entry)
}
