import type { Context } from 'drydock'
import { scheduleChange, scheduleRemove } from './contract'
import type { Store, Stored } from './store'

export const createBook = (ctx: Context, store: Store) => {
  const entries = new Map<string, Stored>()
  const load = () => {
    entries.clear()
    for (const stored of store.load()) entries.set(stored.schedule.id, stored)
  }
  load()
  return {
    load,
    all: () => [...entries.values()],
    get: (id: string) => entries.get(id),
    put(stored: Stored) {
      entries.set(stored.schedule.id, stored)
      store.save(stored)
      ctx.emit(scheduleChange, stored.schedule)
      return stored.schedule
    },
    drop(id: string) {
      const found = entries.get(id)
      if (!found) return false
      entries.delete(id)
      store.remove(id)
      ctx.emit(scheduleRemove, found.schedule)
      return true
    },
  }
}

export type Book = ReturnType<typeof createBook>
