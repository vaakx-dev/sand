import type { Route, Transport, TransportSocket } from '@sand/devices-contract'
import type { ClientMessage, Request } from '@sand/host-hub/contract'
import { TimedOut } from '../errors/timed-out'
import { seconds } from '../time/seconds'
import { parseServerMessage } from './message'

export interface LinkListener {
  event(link: Link, name: string, payload: unknown): void
  closed(link: Link, reason: string): void
  closedError(): Error
}

export interface Link {
  readonly route: Route
  readonly transport: Transport
  call<I, O>(request: Request<I, O>, input: I, timeout: number): Promise<O>
  heard(): number
  retire(max: number): void
  close(): void
}

interface Waiter {
  resolve(value: unknown): void
  reject(error: unknown): void
  timer: ReturnType<typeof setTimeout>
}

export const openLink = async (
  route: Route,
  transport: Transport,
  path: string,
  timeout: number,
  listener: LinkListener,
): Promise<Link> => {
  const pending = new Map<number, Waiter>()
  let socket: TransportSocket | undefined
  let next = 0
  let heardAt = Date.now()
  let closed = false
  let retiring = false
  let retireTimer: ReturnType<typeof setTimeout> | undefined

  const take = (id: number) => {
    const waiter = pending.get(id)
    if (!waiter) return undefined
    pending.delete(id)
    clearTimeout(waiter.timer)
    return waiter
  }

  const settled = () => {
    if (retiring && pending.size === 0) link.close()
  }

  const shut = () => {
    clearTimeout(retireTimer)
    socket?.close()
    const error = listener.closedError()
    for (const waiter of pending.values()) {
      clearTimeout(waiter.timer)
      waiter.reject(error)
    }
    pending.clear()
  }

  const receive = (raw: string) => {
    heardAt = Date.now()
    const message = parseServerMessage(raw)
    if (!message || closed) return
    if (message.type === 'event') return listener.event(link, message.name, message.payload)
    const waiter = take(message.id)
    if (!waiter) return
    if (message.error !== undefined) waiter.reject(new Error(message.error))
    else waiter.resolve(message.result)
    settled()
  }

  const lost = (reason: string) => {
    if (closed) return
    closed = true
    listener.closed(link, reason)
    shut()
  }

  const send = (id: number, type: string, input: unknown) => {
    try {
      socket!.send(JSON.stringify({ type, id, input } satisfies ClientMessage))
    } catch (error) {
      take(id)?.reject(error)
      settled()
    }
  }

  const link: Link = {
    route,
    transport,
    call: <I, O>(request: Request<I, O>, input: I, wait: number) =>
      new Promise<O>((resolve, reject) => {
        if (closed || !socket) return reject(listener.closedError())
        const id = ++next
        const timer = setTimeout(() => {
          take(id)
          reject(new TimedOut(`${request.id} got no answer within ${seconds(wait)}`))
          settled()
        }, wait)
        pending.set(id, { resolve: resolve as (value: unknown) => void, reject, timer })
        send(id, request.id, input)
      }),
    heard: () => heardAt,
    retire(max) {
      retiring = true
      if (pending.size === 0) return link.close()
      retireTimer = setTimeout(() => link.close(), max)
    },
    close() {
      if (closed) return
      closed = true
      shut()
    },
  }

  socket = await transport.socket(path, { message: receive, closed: lost }, timeout)
  if (closed) socket.close()
  return link
}
