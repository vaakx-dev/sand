import { serial } from '@sand/util'
import { writeAtomic } from '@sand/util/fs'
import { z } from 'zod'
import { entry, type Entry } from './contract'

export const createStore = async (file: string, changed: (entries: Entry[]) => void) => {
  const found = Bun.file(file)
  let entries = z.array(entry).parse((await found.exists()) ? await found.json() : [])
  const queue = serial()
  const save = async (next: Entry[]) => {
    entries = next
    changed(entries)
    await queue(() => writeAtomic(file, JSON.stringify(entries)))
  }
  return {
    list: () => entries,
    async add(stashed: Omit<Entry, 'id' | 'at'>) {
      const added = { ...stashed, id: crypto.randomUUID(), at: Date.now() }
      await save([added, ...entries])
      return added
    },
    remove: (id: string) => save(entries.filter(other => other.id !== id)),
  }
}
