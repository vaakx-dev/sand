import type { Store } from './store'
import { isObjectId } from './tree'

export interface Snapshot {
  tree: string
  parents: string[]
  time: number
}

const parsed = new WeakMap<Store, Map<string, Snapshot>>()

const cacheOf = (store: Store) => {
  const found = parsed.get(store) ?? new Map<string, Snapshot>()
  parsed.set(store, found)
  return found
}

const parse = (text: string): Snapshot => {
  const { tree, parents, time } = JSON.parse(text)
  if (!isObjectId(tree) || !Array.isArray(parents) || !parents.every(isObjectId) || !Number.isFinite(time)) throw new Error('That is not a sync snapshot')
  return { tree, parents, time }
}

export const writeSnapshot = async (store: Store, tree: string, parents: (string | null)[]) => {
  const snapshot = { tree, parents: [...new Set(parents.filter(parent => parent !== null))], time: Date.now() }
  const id = await store.put(new TextEncoder().encode(JSON.stringify(snapshot)))
  cacheOf(store).set(id, snapshot)
  return id
}

export const readSnapshot = async (store: Store, id: string) => {
  const cache = cacheOf(store)
  const known = cache.get(id)
  if (known) return known
  const snapshot = parse(new TextDecoder().decode(await store.read(id)))
  cache.set(id, snapshot)
  return snapshot
}

export const hasSnapshot = async (store: Store, id: string) =>
  (await store.has(id)) &&
  readSnapshot(store, id).then(
    () => true,
    () => false,
  )
