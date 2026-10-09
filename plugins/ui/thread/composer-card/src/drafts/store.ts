import type { UserContent } from '@sand/messages'
import type { DraftTarget } from '@sand/web-client/contract'

export interface Saved {
  text: string
  items: UserContent[]
  target?: DraftTarget
  updated?: number
}

const empty: Saved = { text: '', items: [] }

export const isBlank = (saved: Saved) => !saved.text.trim() && !saved.items.length

let database: Promise<IDBDatabase> | undefined

const open = () =>
  (database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const opening = indexedDB.open('sand-drafts', 1)
    opening.onupgradeneeded = () => opening.result.createObjectStore('drafts')
    opening.onerror = () => {
      database = undefined
      reject(opening.error)
    }
    opening.onsuccess = () => resolve(opening.result)
  }))

const request = async <T>(run: (store: IDBObjectStore) => IDBRequest<T>, mode: IDBTransactionMode) => {
  const db = await open()
  return new Promise<T>((resolve, reject) => {
    const done = run(db.transaction('drafts', mode).objectStore('drafts'))
    done.onsuccess = () => resolve(done.result)
    done.onerror = () => reject(done.error)
  })
}

export const createStore = () => {
  const memory = new Map<string, Saved>()
  const save = (key: string, saved: Saved) => {
    memory.set(key, saved)
    void request<unknown>(store => (isBlank(saved) ? store.delete(key) : store.put(saved, key)) as IDBRequest<unknown>, 'readwrite').catch(() => {})
  }
  return {
    save,
    remove: (key: string) => save(key, empty),
    peek: (key: string) => memory.get(key),
    async load(key: string): Promise<Saved> {
      const known = memory.get(key)
      if (known) return known
      try {
        return (await request<Saved | undefined>(store => store.get(key), 'readonly')) ?? empty
      } catch {
        return empty
      }
    },
    async all(): Promise<Saved[]> {
      try {
        return await request<Saved[]>(store => store.getAll(), 'readonly')
      } catch {
        return []
      }
    },
  }
}

export type DraftStore = ReturnType<typeof createStore>
