const name = 'sand-cache'
const version = 2
const stores = ['meta', 'threads', 'tails', 'entries'] as const

export type PickStore = (store: (typeof stores)[number]) => IDBObjectStore

let database: Promise<IDBDatabase> | undefined

const createStores = (db: IDBDatabase) => {
  for (const store of [...db.objectStoreNames]) db.deleteObjectStore(store)
  for (const store of stores) db.createObjectStore(store)
}

const connect = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('No IndexedDB'))
    const opening = indexedDB.open(name, version)
    opening.onupgradeneeded = () => createStores(opening.result)
    opening.onerror = () => reject(opening.error)
    opening.onblocked = () => reject(new Error('Cache is blocked'))
    opening.onsuccess = () => {
      const db = opening.result
      db.onversionchange = () => {
        db.close()
        database = undefined
      }
      resolve(db)
    }
  })

const open = () => (database ??= connect())

export const transact = async <T>(mode: IDBTransactionMode, run: (pick: PickStore) => () => T) => {
  const db = await open()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction([...stores], mode)
    const result = run(store => tx.objectStore(store))
    tx.oncomplete = () => resolve(result())
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('Cache write was aborted'))
  })
}

export const under = (...prefix: string[]) => IDBKeyRange.bound(prefix, [...prefix, []])
