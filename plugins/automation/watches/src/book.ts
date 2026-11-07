import type { Context } from 'drydock'
import { watchChange, watchRemove } from './contract'
import type { Store, Stored } from './store'

export const createBook = (ctx: Context, store: Store) => {
  const entries = new Map(store.load().map(stored => [stored.watch.id, stored]))

  const put = (stored: Stored) => {
    const before = entries.get(stored.watch.id)
    entries.set(stored.watch.id, stored)
    store.save(stored)
    if (before?.watch !== stored.watch) ctx.emit(watchChange, stored.watch)
  }

  return {
    all: () => [...entries.values()],
    get: (id: string) => entries.get(id),
    put,
    update(id: string, change: (stored: Stored) => Stored) {
      const found = entries.get(id)
      if (found) put(change(found))
    },
    drop(id: string) {
      const found = entries.get(id)
      if (!found) return false
      entries.delete(id)
      store.remove(id)
      ctx.emit(watchRemove, found.watch)
      return true
    },
  }
}

export type Book = ReturnType<typeof createBook>
