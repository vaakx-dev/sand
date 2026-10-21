import { collectScope, disposeAll, listen } from '@vaakx-dev/vrui'
import type { Saved } from '../drafts/store'

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
  const opening = indexedDB.open('sand-drafts', 1)
  return settled(opening, () => opening.result.createObjectStore('drafts'))
}

const open = () =>
  (database ??= connect().catch(error => {
    database = undefined
    throw error
  }))

const drafts = async (mode: IDBTransactionMode) => (await open()).transaction('drafts', mode).objectStore('drafts')

export const readDraft = async (key: string): Promise<Saved | undefined> => settled((await drafts('readonly')).get(key))

export const readDrafts = async (): Promise<Saved[]> => settled((await drafts('readonly')).getAll())

export const writeDraft = async (key: string, saved: Saved) => settled((await drafts('readwrite')).put(saved, key))

export const deleteDraft = async (key: string) => settled((await drafts('readwrite')).delete(key))
