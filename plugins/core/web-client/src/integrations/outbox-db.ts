import { collectScope, disposeAll, listen } from '@vaakx-dev/vrui'
import type { OutboxItem } from '../contract'
import type { OutboxSaved, SavedPc } from '../outbox/outbox'

type StoreName = 'items' | 'pcs'

let database: Promise<IDBDatabase> | undefined

const settled = <T>(request: IDBRequest<T>, upgrade?: () => void) => {
  const { value, scope } = collectScope(
    () =>
      new Promise<T>((resolve, reject) => {
        if (upgrade) listen(request, 'upgradeneeded', upgrade)
        listen(request, 'success', () => resolve(request.result))
        listen(request, 'error', () => reject(request.error))
      }),
  )
  return value.finally(() => disposeAll(scope))
}

const connect = () => {
  const opening = indexedDB.open('sand-outbox', 1)
  return settled(opening, () => {
    opening.result.createObjectStore('items')
    opening.result.createObjectStore('pcs')
  })
}

const open = () =>
  (database ??= connect().catch(error => {
    database = undefined
    throw error
  }))

const store = async (name: StoreName, mode: IDBTransactionMode) => (await open()).transaction(name, mode).objectStore(name)

export const outboxDb: OutboxSaved = {
  load: async () => ({
    items: await settled<OutboxItem[]>((await store('items', 'readonly')).getAll()),
    pcs: await settled<SavedPc[]>((await store('pcs', 'readonly')).getAll()),
  }),
  put: async item => void (await settled((await store('items', 'readwrite')).put(item, item.id))),
  remove: async id => settled((await store('items', 'readwrite')).delete(id)),
  remember: async pc => void (await settled((await store('pcs', 'readwrite')).put(pc, pc.pc))),
}
