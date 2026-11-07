import { errorMessage } from '@sand/util'
import type { Book } from './book'
import type { Handler } from './contract'
import { batchOf, empty, joined } from './queue'
import type { Stored } from './store'

export interface Timings {
  debounce_ms: number
  retry_ms: number
}

export const createDelivery = (book: Book, handlers: Map<string, Handler>, { debounce_ms, retry_ms }: Timings) => {
  const timers = new Map<string, Timer>()
  const running = new Set<string>()
  const stopped = new AbortController()

  const later = (id: string, ms: number) => {
    if (timers.has(id) || running.has(id) || stopped.signal.aborted) return
    timers.set(
      id,
      setTimeout(() => {
        timers.delete(id)
        void send(id)
      }, ms),
    )
  }

  const attempt = async ({ watch, queue }: Stored, handler: Handler) => {
    try {
      await handler(watch, batchOf(queue, watch.target), stopped.signal)
      return undefined
    } catch (error) {
      return errorMessage(error)
    }
  }

  const settle = (id: string, error: string | undefined) => {
    const found = book.get(id)
    if (!found) return
    const { watch, queue, sending = empty, ...rest } = found
    if (error) {
      book.put({ ...rest, watch: { ...watch, error }, queue: joined(sending, queue) })
      return later(id, retry_ms)
    }
    book.put({ ...rest, watch: watch.error ? { ...watch, error: undefined } : watch, queue })
    if (queue.changes.length) later(id, debounce_ms)
  }

  const send = async (id: string) => {
    const stored = book.get(id)
    const handler = stored && handlers.get(stored.watch.owner)
    if (!stored?.queue.changes.length || !handler) return
    running.add(id)
    book.put({ ...stored, queue: empty, sending: stored.queue })
    const error = await attempt(stored, handler)
    running.delete(id)
    if (!stopped.signal.aborted) settle(id, error)
  }

  const soon = (id: string) => later(id, debounce_ms)

  return {
    soon,
    wake(owner: string) {
      for (const { watch, queue } of book.all()) if (watch.owner === owner && queue.changes.length) soon(watch.id)
    },
    forget(id: string) {
      clearTimeout(timers.get(id))
      timers.delete(id)
    },
    stop() {
      stopped.abort()
      for (const timer of timers.values()) clearTimeout(timer)
      timers.clear()
    },
  }
}
