export interface KeyVal<T> {
  get(key: string): Promise<T | undefined>
  all(): Promise<T[]>
  put(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
}

const settled = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const connect = (database: string, store: string) =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const opening = indexedDB.open(database, 1)
    opening.onupgradeneeded = () => opening.result.createObjectStore(store)
    opening.onsuccess = () => resolve(opening.result)
    opening.onerror = () => reject(opening.error)
  })

export const keyval = <T>(database: string, store: string): KeyVal<T> => {
  let opened: Promise<IDBDatabase> | undefined
  const open = () =>
    (opened ??= connect(database, store).catch(error => {
      opened = undefined
      throw error
    }))
  const objects = async (mode: IDBTransactionMode) => (await open()).transaction(store, mode).objectStore(store)
  return {
    get: async key => settled<T | undefined>((await objects('readonly')).get(key)),
    all: async () => settled<T[]>((await objects('readonly')).getAll()),
    put: async (key, value) => void (await settled((await objects('readwrite')).put(value, key))),
    remove: async key => void (await settled((await objects('readwrite')).delete(key))),
  }
}
