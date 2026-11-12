import { collectScope, disposeAll, listen } from '@vaakx-dev/vrui'
import type { OutboxItem } from '../contract'
import type { OutboxSaved } from '../outbox/outbox'

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
  })
}

const open = () =>
  (database ??= connect().catch(error => {
    database = undefined
    throw error
  }))

const items = async (mode: IDBTransactionMode) => (await open()).transaction('items', mode).objectStore('items')

export const outboxDb: OutboxSaved = {
  load: async () => settled<OutboxItem[]>((await items('readonly')).getAll()),
  put: async item => void (await settled((await items('readwrite')).put(item, item.id))),
  remove: async id => settled((await items('readwrite')).delete(id)),
}
