export interface FileEntry {
  path: string
  directory: boolean
}

const expanded = new WeakMap<string[], FileEntry[]>()

export const withDirectories = (files: string[]): FileEntry[] => {
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
