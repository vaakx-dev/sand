export interface Folder {
  path: string
  name: string
  folders: Map<string, Folder>
  files: string[]
}

const folder = (path: string, name: string): Folder => ({ path, name, folders: new Map(), files: [] })

const child = (parent: Folder, name: string) => {
  const found = parent.folders.get(name)
  if (found) return found
  const made = folder(parent.path ? `${parent.path}/${name}` : name, name)
  parent.folders.set(name, made)
  return made
}

export const buildTree = (paths: string[]) => {
  const root = folder('', '')
  for (const path of paths) {
    const parent = path.split('/').slice(0, -1).reduce(child, root)
    parent.files.push(path)
  }
  return root
}

export const foldersOf = (paths: string[]) => {
  const folders = new Set<string>()
  for (const path of paths) {
    const parts = path.split('/')
    for (let end = 1; end < parts.length; end++) folders.add(parts.slice(0, end).join('/'))
  }
  return folders
}
