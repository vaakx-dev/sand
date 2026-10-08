import type { Pending } from '@sand/protocol'
import { join } from 'node:path'

export const createStore = async (home: string) => {
  const file = Bun.file(join(home, 'followups.json'))
  const queues = new Map<string, Pending[]>(Object.entries((await file.exists()) ? ((await file.json()) as Record<string, Pending[]>) : {}))
  let writing = Promise.resolve()

  const save = () => {
    const data = Object.fromEntries([...queues].filter(([, items]) => items.length))
    writing = writing.then(() => Bun.write(file, JSON.stringify(data)).then(() => undefined)).catch(() => undefined)
  }

  return {
    get: (session: string) => queues.get(session) ?? [],
    set(session: string, items: Pending[]) {
      if (items.length) queues.set(session, items)
      else queues.delete(session)
      save()
    },
  }
}
