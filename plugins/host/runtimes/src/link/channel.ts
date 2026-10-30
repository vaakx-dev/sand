import type { WireEvent } from '@sand/host-hub/contract'
import type { HostChannel, HostMessage, RuntimeMessage } from '../contract'

interface Waiter {
  resolve(value: unknown): void
  reject(error: Error): void
  timer: Timer
}

type Listener = (payload: unknown) => void

const defaultTimeout = 30_000

export const createHostChannel = (send: (message: RuntimeMessage) => void) => {
  const pending = new Map<number, Waiter>()
  const listeners = new Map<string, Set<Listener>>()
  let next = 0

  const take = (id: number) => {
    const waiter = pending.get(id)
    pending.delete(id)
    if (waiter) clearTimeout(waiter.timer)
    return waiter
  }

  const channel: HostChannel = {
    call: (request, input, timeout = defaultTimeout) =>
      new Promise((resolve, reject) => {
        const id = ++next
        const timer = setTimeout(() => take(id)?.reject(new Error(`the host didn't answer ${request.id} in time`)), timeout)
        pending.set(id, { resolve: resolve as (value: unknown) => void, reject, timer })
        send({ type: 'call', id, request: request.id, input })
      }),
    on<P>(event: WireEvent<P>, listener: (payload: P) => void) {
      const set = listeners.get(event.id) ?? new Set<Listener>()
      const added = listener as Listener
      set.add(added)
      listeners.set(event.id, set)
      return () => void set.delete(added)
    },
  }

  const receive = (message: HostMessage) => {
    if (message.type === 'event') for (const listener of [...(listeners.get(message.name) ?? [])]) listener(message.payload)
    if (message.type !== 'answer') return
    const waiter = take(message.id)
    if (message.error !== undefined) waiter?.reject(new Error(message.error))
    else waiter?.resolve(message.result)
  }

  const close = () => {
    for (const id of [...pending.keys()]) take(id)?.reject(new Error('the host link closed'))
  }

  return { channel, receive, close }
}
