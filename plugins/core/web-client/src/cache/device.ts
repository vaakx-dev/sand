import type { Context } from 'drydock'
import type { DeviceCache, DeviceRecords } from '../contract'
import { after } from '../detached'
import { onIdle } from '../integrations/idle'
import { transact } from '../integrations/indexed-db'
import { onLeave } from './leave'

interface Queue {
  owner: string
  waiting: Map<string, unknown>
}

const FIRST_WRITE_MS = 500
const WRITE_GAP_MS = 10_000

const readRecord = (scope: string, owner: string, key: string) =>
  transact('readonly', pick => {
    const found = pick('records').get([scope, owner, key])
    return () => found.result
  })

const writeRecords = (scope: string, queues: Queue[]) =>
  transact('readwrite', pick => {
    for (const { owner, waiting } of queues)
      for (const [key, value] of waiting) {
        if (value === undefined) pick('records').delete([scope, owner, key])
        else pick('records').put(value, [scope, owner, key])
      }
    return () => undefined
  })

export const createDevice = (ctx: Context, here: string, scope: () => string | undefined) => {
  const queues = new Set<Queue>()
  let pending: (() => void) | undefined
  let wroteAt = Number.NEGATIVE_INFINITY

  const waiting = () => [...queues].some(queue => queue.waiting.size)

  const flush = () => {
    pending?.()
    pending = undefined
    const current = scope()
    if (!current || !waiting()) return
    const taken = [...queues].map(({ owner, waiting }) => ({ owner, waiting: new Map(waiting) }))
    for (const queue of queues) queue.waiting.clear()
    wroteAt = Date.now()
    void writeRecords(current, taken).catch(() => {})
  }

  const schedule = () => {
    if (pending || !waiting() || !scope()) return
    const delayMs = Math.max(FIRST_WRITE_MS, wroteAt + WRITE_GAP_MS - Date.now())
    pending = after(delayMs, () => onIdle(flush))
  }

  const records = <T>(owner: string): DeviceRecords<T> => {
    const waiting = new Map<string, T | undefined>()
    queues.add({ owner, waiting })
    const change = (key: string, value: T | undefined) => {
      waiting.set(key, value)
      schedule()
    }
    return {
      read: async key => (waiting.has(key) ? waiting.get(key) : readRecord(here, owner, key).catch(() => undefined)),
      write: change,
      remove: key => change(key, undefined),
    }
  }

  onLeave(ctx, flush)
  ctx.effect(() => () => pending?.())

  return {
    cache: { records } satisfies DeviceCache,
    resume: schedule,
    forget() {
      pending?.()
      pending = undefined
      for (const queue of queues) queue.waiting.clear()
    },
  }
}
