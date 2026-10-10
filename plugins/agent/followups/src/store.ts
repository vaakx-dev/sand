import { isRecord, serial } from '@sand/kit'
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
      return isRecord(data) ? (data as Queues) : {}
    } catch {
      return {}
    }
  }

  const queues = new Map<string, Pending[]>(Object.entries(await read()))
  const queue = serial()

  const write = async (session: string) => {
    const data = await read()
    const items = queues.get(session)
    if (items?.length) data[session] = items
    else delete data[session]
    await Bun.write(staging, JSON.stringify(data))
    await replaceFile(staging, path)
  }

  return {
    get: (session: string) => queues.get(session) ?? [],
    set(session: string, items: Pending[]) {
      if (items.length) queues.set(session, items)
      else queues.delete(session)
      return queue(() => write(session))
    },
    async refresh(session: string) {
      const items = (await queue(read))[session] ?? []
      if (items.length) queues.set(session, items)
      else queues.delete(session)
      return items
    },
  }
}
