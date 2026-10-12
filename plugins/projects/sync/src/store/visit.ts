import { limited } from '@sand/kit'
import type { Store } from './store'
import { readTree, type TreeEntry } from './tree'

type Descend = boolean | void

export type Visit = (entry: TreeEntry, path: string) => Descend | Promise<Descend>

const readers = 32

export const visitTree = async (store: Store, id: string, visit: Visit) => {
  const run = limited(readers)
  const walk = async (treeId: string, prefix: string): Promise<void> => {
    const entries = await run(() => readTree(store, treeId))
    const descend = await Promise.all(entries.map(async entry => (await visit(entry, prefix + entry.name)) !== false && entry.kind === 'tree'))
    const inner = entries.filter((_, index) => descend[index])
    await Promise.all(inner.map(entry => walk(entry.id, `${prefix}${entry.name}/`)))
  }
  await walk(id, '')
}

export const treeFiles = async (store: Store, id: string, prefix = '') => {
  const files: { path: string; entry: TreeEntry }[] = []
  await visitTree(store, id, (entry, path) => {
    if (entry.kind !== 'tree') files.push({ path: prefix + path, entry })
  })
  return files
}

export const treeSizes = async (store: Store, id: string) => {
  const files = await treeFiles(store, id)
  return { files: files.length, bytes: files.reduce((sum, { entry }) => sum + entry.size, 0) }
}
