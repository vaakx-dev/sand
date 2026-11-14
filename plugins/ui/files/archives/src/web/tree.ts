import type { Entry, Listing } from './entry'

interface Folder {
  path: string
  name: string
  parent?: Folder
  folders: Map<string, Folder>
  files: Entry[]
  size: number
}

const nameOf = (path: string) => path.slice(path.lastIndexOf('/') + 1)

const folderAt = (parent: Folder, name: string) => {
  const found = parent.folders.get(name)
  if (found) return found
  const made: Folder = { path: parent.path ? `${parent.path}/${name}` : name, name, parent, folders: new Map(), files: [], size: 0 }
  parent.folders.set(name, made)
  return made
}

const walk = (root: Folder, parts: string[]) => parts.reduce(folderAt, root)

const treeOf = ({ entries, folders }: Listing) => {
  const root: Folder = { path: '', name: '', folders: new Map(), files: [], size: 0 }
  folders.forEach(path => walk(root, path.split('/')))
  entries.forEach(entry => {
    const parts = entry.path.split('/')
    const folder = walk(root, parts.slice(0, -1))
    folder.files.push(entry)
    for (let at: Folder | undefined = folder; at; at = at.parent) at.size += entry.size
  })
  return root
}

const byName = (first: { name: string }, second: { name: string }) => first.name.localeCompare(second.name, undefined, { numeric: true, sensitivity: 'base' })

const childrenOf = (folder: Folder) => ({
  folders: [...folder.folders.values()].toSorted(byName),
  files: folder.files.map(entry => ({ name: nameOf(entry.path), entry })).toSorted(byName),
})

const findEntry = (root: Folder, path: string) => {
  const folder = path
    .split('/')
    .slice(0, -1)
    .reduce<Folder | undefined>((at, name) => at?.folders.get(name), root)
  const entry = folder?.files.find(file => file.path === path)
  return folder && entry ? { folder, entry } : undefined
}

const itemCount = (folder: Folder) => folder.folders.size + folder.files.length

export { childrenOf, findEntry, itemCount, nameOf, treeOf, type Folder }
