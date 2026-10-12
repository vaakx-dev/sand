import { isRecord, serial } from '@sand/kit'
import { writeAtomic } from '@sand/kit/fs'
import { join } from 'node:path'
import type { Schedule } from './contract'

type BySession = Record<string, Schedule[]>

export const createStore = async (home: string) => {
  const path = join(home, 'schedules.json')
  const file = Bun.file(path)

  const read = async (): Promise<BySession> => {
    try {
      const data: unknown = await file.json()
      return isRecord(data) ? (data as BySession) : {}
    } catch {
      return {}
    }
  }

  const lists = new Map<string, Schedule[]>(Object.entries(await read()))
  const queue = serial()

  const keep = (session: string, items: Schedule[]) => {
    if (items.length) lists.set(session, items)
    else lists.delete(session)
    return items
  }

  const write = async (session: string) => {
    const data = await read()
    const items = lists.get(session)
    if (items?.length) data[session] = items
    else delete data[session]
    await writeAtomic(path, JSON.stringify(data))
  }

  return {
    get: (session: string) => lists.get(session) ?? [],
    all: () => [...lists.values()].flat(),
    set(session: string, items: Schedule[]) {
      keep(session, items)
      return queue(() => write(session))
    },
    refresh: async (session: string) => keep(session, (await queue(read))[session] ?? []),
  }
}

export type Store = Awaited<ReturnType<typeof createStore>>
