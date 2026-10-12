import { hashOf } from './encoding'
import type { Store } from './store'

export type EntryKind = 'file' | 'exec' | 'link' | 'tree'

export interface TreeEntry {
  name: string
  kind: EntryKind
  id: string
  size: number
}

const codes: Record<EntryKind, string> = { file: 'f', exec: 'x', link: 'l', tree: 't' }

const kinds: Record<string, EntryKind> = { f: 'file', x: 'exec', l: 'link', t: 'tree' }

export const emptyTree = hashOf(new Uint8Array(0))

export const sameEntry = (a: TreeEntry | undefined, b: TreeEntry | undefined) => a?.id === b?.id && a?.kind === b?.kind

const isSafeName = (name: string) => name !== '' && name !== '.' && name !== '..' && !/[/\\\0]/.test(name)

export const isObjectId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)

const byName = (a: TreeEntry, b: TreeEntry) => (a.name < b.name ? -1 : Number(a.name > b.name))

const serialise = (entries: TreeEntry[]) => entries.map(entry => `${codes[entry.kind]} ${entry.id} ${entry.size} ${entry.name}\0`).join('')

const parseEntry = (record: string): TreeEntry => {
  const kind = kinds[record[0] ?? '']
  const id = record.slice(2, 66)
  const sizeEnd = record.indexOf(' ', 67)
  const name = record.slice(sizeEnd + 1)
  if (!kind || !isSafeName(name) || !isObjectId(id)) throw new Error('A folder listing in the sync store is not valid')
  return { name, kind, id, size: Number(record.slice(67, sizeEnd)) }
}

export const writeTree = (store: Store, entries: TreeEntry[]) => store.put(new TextEncoder().encode(serialise(entries.toSorted(byName))))

export const readTree = async (store: Store, id: string) => {
  if (id === emptyTree) return []
  const text = new TextDecoder().decode(await store.read(id))
  return text.split('\0').filter(Boolean).map(parseEntry)
}

export const readTreeMap = async (store: Store, id: string | undefined) =>
  new Map((id ? await readTree(store, id) : []).map(entry => [entry.name, entry]))
