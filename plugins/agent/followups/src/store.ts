import { replaceFile } from '@sand/kit/fs'
import type { Pending } from '@sand/steering/contract'
import { join } from 'node:path'

type Queues = Record<string, Pending[]>

export const createStore = async (home: string) => {
  const path = join(home, 'followups.json')
  const staging = `${path}.${Bun.randomUUIDv7()}.tmp`
  const file = Bun.file(path)

  const read = async (): Promise<Queues> => {
    try {
      const data: unknown = await file.json()
      return data && typeof data === 'object' && !Array.isArray(data) ? (data as Queues) : {}
    } catch {
      return {}
    }
  }

  const queues = new Map<string, Pending[]>(Object.entries(await read()))
  let writing = Promise.resolve()

  const save = (session: string) => {
    writing = writing
      .then(async () => {
        const data = await read()
        const items = queues.get(session)
        if (items?.length) data[session] = items
        else delete data[session]
        await Bun.write(staging, JSON.stringify(data))
        await replaceFile(staging, path)
      })
      .catch(() => undefined)
  }

  return {
    get: (session: string) => queues.get(session) ?? [],
    set(session: string, items: Pending[]) {
      if (items.length) queues.set(session, items)
      else queues.delete(session)
      save(session)
    },
    async refresh(session: string) {
      const loaded = writing.then(read)
      writing = loaded.then(() => undefined)
      const items = (await loaded)[session] ?? []
      if (items.length) queues.set(session, items)
      else queues.delete(session)
      return items
    },
  }
}
