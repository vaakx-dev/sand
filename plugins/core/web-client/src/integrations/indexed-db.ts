const name = 'sand-cache'
const version = 1

export const stores = ['meta', 'threads', 'tails', 'entries'] as const

export type StoreName = (typeof stores)[number]

let database: Promise<IDBDatabase> | undefined

const upgrade = (db: IDBDatabase) => {
  for (const store of [...db.objectStoreNames]) db.deleteObjectStore(store)
  for (const store of stores) db.createObjectStore(store)
}

const dropped = () =>
  new Promise<void>((resolve, reject) => {
    const deleting = indexedDB.deleteDatabase(name)
    deleting.onsuccess = () => resolve()
    deleting.onerror = () => reject(deleting.error)
    deleting.onblocked = () => reject(new Error('Cache is blocked'))
  })

const newer = (error: unknown) => error instanceof DOMException && error.name === 'VersionError'

const open = () =>
  (database ??= connect().catch(error => (newer(error) ? dropped().then(connect) : Promise.reject(error))))

const connect = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('No IndexedDB'))
    const opening = indexedDB.open(name, version)
    opening.onupgradeneeded = () => upgrade(opening.result)
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

export const transact = async <T>(mode: IDBTransactionMode, run: (pick: (store: StoreName) => IDBObjectStore) => () => T) => {
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
