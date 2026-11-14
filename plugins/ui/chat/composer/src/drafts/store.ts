import type { UserContent } from '@sand/chats/contract'
import type { Held } from '@sand/attachments/web/contract'
import type { KeyVal } from '@sand/keyval'
import type { Draft, DraftStore } from '../contract'

export interface Saved extends Omit<Draft, 'items'> {
  items: Held[]
}

export interface Kept {
  items: Held[]
  updated: number
}

const empty: Saved = { text: '', items: [] }

export const isBlank = (saved: Saved) => !saved.text.trim() && !saved.items.length

const newer = <T extends { updated?: number }>(...found: (T | undefined)[]) =>
  found.reduce<T | undefined>((best, next) => ((next?.updated ?? 0) > (best?.updated ?? 0) ? next : best), undefined)

const sameItems = (one: Held[], other: Held[]) => one.length === other.length && one.every((item, at) => item === other[at])

export const createStore = (remote: () => DraftStore | undefined, local: KeyVal<Kept>, uploaded: (items: Held[]) => UserContent[]) => {
  const memory = new Map<string, Saved>()
  const versions = new Map<string, number>()
  const kept = new Map<string, Held[]>()

  const send = async (key: string, saved: Saved, version: number) => {
    const found = remote()
    if (!found) return
    const draft = isBlank(saved) ? undefined : { ...saved, items: uploaded(saved.items) }
    if (versions.get(key) === version) await found.write(key, draft)
  }

  const keep = (key: string, saved: Saved) => {
    const pending = uploaded(saved.items).length < saved.items.length
    const items = pending ? saved.items : []
    if (sameItems(kept.get(key) ?? [], items)) return
    kept.set(key, items)
    void (pending ? local.put(key, { items, updated: saved.updated ?? Date.now() }) : local.remove(key)).catch(() => {})
  }

  const save = (key: string, saved: Saved) => {
    const version = (versions.get(key) ?? 0) + 1
    versions.set(key, version)
    const stamped = { ...saved, updated: saved.updated ?? Date.now() }
    memory.set(key, stamped)
    keep(key, stamped)
    void send(key, stamped, version).catch(() => {})
  }

  const withKept = (saved: Saved | undefined, found: Kept | undefined) => {
    if (!found) return saved
    return { ...(saved ?? empty), items: found.items, updated: Math.max(saved?.updated ?? 0, found.updated) }
  }

  return {
    save,
    remove: (key: string) => save(key, empty),
    peek: (key: string) => memory.get(key),
    async load(key: string): Promise<Saved> {
      const [far, files] = await Promise.all([remote()?.read(key), local.get(key).catch(() => undefined)])
      if (files) kept.set(key, files.items)
      const known = memory.get(key)
      const found = newer<Saved>(known, far)
      return (known ? found : withKept(found, files)) ?? empty
    },
    all: async () => (await remote()?.all().catch(() => undefined)) ?? [],
  }
}
