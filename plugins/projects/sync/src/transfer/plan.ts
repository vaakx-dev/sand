import { lineage } from '../snapshot/lineage'
import { hasSnapshot, readSnapshot } from '../store/snapshots'
import type { Store } from '../store/store'
import type { TreeEntry } from '../store/tree'
import { visitTree } from '../store/visit'

export interface PackedBlob {
  path: string
  entry: TreeEntry
}

export interface PackPlan {
  snapshots: string[]
  trees: string[]
  blobs: PackedBlob[]
}

const maxSnapshots = 1000

const receiverObjects = async (store: Store, known: string[]) => {
  const held = new Set<string>()
  for (const id of known) {
    const { tree } = await readSnapshot(store, id)
    if (held.has(tree) || !(await store.has(tree))) continue
    held.add(tree)
    await visitTree(store, tree, async entry => {
      if (held.has(entry.id) || (entry.kind === 'tree' && !(await store.has(entry.id)))) return false
      held.add(entry.id)
    })
  }
  return held
}

export const planPack = async (store: Store, head: string, have: string[]): Promise<PackPlan> => {
  const present = await Promise.all(have.map(id => hasSnapshot(store, id)))
  const known = have.filter((_, index) => present[index])
  const held = await receiverObjects(store, known)
  const plan: PackPlan = { snapshots: await lineage(store, head, maxSnapshots, new Set(known)), trees: [], blobs: [] }
  const { tree } = await readSnapshot(store, head)
  if (held.has(tree)) return plan
  plan.trees.push(tree)
  held.add(tree)
  await visitTree(store, tree, (entry, path) => {
    if (held.has(entry.id)) return false
    held.add(entry.id)
    if (entry.kind === 'tree') plan.trees.push(entry.id)
    else plan.blobs.push({ path, entry })
  })
  return plan
}
