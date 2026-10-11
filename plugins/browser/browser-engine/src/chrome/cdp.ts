import type { Dispose } from 'drydock'

interface Waiting {
  method: string
  resolve(result: unknown): void
  reject(error: Error): void
}

type Handler = (params: unknown) => void

export interface Cdp {
  send<T = unknown>(method: string, params?: object): Promise<T>
  fire(method: string, params?: object): void
  on<T>(method: string, handler: (params: T) => void): Dispose
  closed: Promise<void>
  close(): void
}

const deliver = (handlers: Map<string, Set<Handler>>, method: string, params: unknown) => {
  for (const handler of handlers.get(method) ?? []) handler(params)
}

export const connect = (url: string) =>
  new Promise<Cdp>((resolve, reject) => {
    const socket = new WebSocket(url)
    const pending = new Map<number, Waiting>()
    const handlers = new Map<string, Set<Handler>>()
    const { promise: closed, resolve: ended } = Promise.withResolvers<void>()
    let next = 0

    const cdp: Cdp = {
      send(method, params = {}) {
        const id = ++next
        socket.send(JSON.stringify({ id, method, params }))
        return new Promise((resolve, reject) => pending.set(id, { method, resolve, reject }))
      },
      fire(method, params) {
        cdp.send(method, params).catch(() => undefined)
      },
      on(method, handler) {
        const set = handlers.get(method) ?? new Set()
        const typed: Handler = params => handler(params as Parameters<typeof handler>[0])
        handlers.set(method, set)
        set.add(typed)
        return () => void set.delete(typed)
      },
      closed,
      close: () => socket.close(),
    }

    socket.onopen = () => resolve(cdp)
    socket.onerror = () => reject(new Error('Could not connect to the browser'))
    socket.onclose = () => {
      for (const waiting of pending.values()) waiting.reject(new Error(`The browser closed the connection during ${waiting.method}`))
      pending.clear()
      ended()
    }
    socket.onmessage = event => {
      const message = JSON.parse(String(event.data))
      const waiting = message.id === undefined ? undefined : pending.get(message.id)
      if (!waiting) return deliver(handlers, message.method, message.params)
      pending.delete(message.id)
      if (message.error) waiting.reject(new Error(`${waiting.method}: ${message.error.message}`))
      else waiting.resolve(message.result)
    }
  })
