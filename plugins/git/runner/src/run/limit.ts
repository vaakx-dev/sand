import { AsyncLocalStorage } from 'node:async_hooks'

type Lane = 'now' | 'background'

const MOST = 8
const LONG_MS = 30_000

const lane = new AsyncLocalStorage<Lane>()
const waiting: Record<Lane, (() => void)[]> = { now: [], background: [] }
let running = 0

const acquire = async () => {
  if (running < MOST) {
    running++
    return
  }
  await new Promise<void>(resolve => waiting[lane.getStore() ?? 'now'].push(resolve))
}

const release = () => {
  const next = waiting.now.shift() ?? waiting.background.shift()
  if (next) next()
  else running--
}

export const limited = async <T>(timeoutMs: number | undefined, work: () => Promise<T>): Promise<T> => {
  if (timeoutMs !== undefined && timeoutMs > LONG_MS) return work()
  await acquire()
  try {
    return await work()
  } finally {
    release()
  }
}

export const inBackground = <T>(work: () => Promise<T>) => lane.run('background', work)
