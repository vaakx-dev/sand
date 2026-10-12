import type { ServerMessage, WireRequest } from '@sand/protocol'

const socketMessages = { timeout: 'no answer in time', closed: 'the connection closed', failed: 'the connection failed' }

export class SocketError extends Error {
  constructor(readonly kind: keyof typeof socketMessages) {
    super(socketMessages[kind])
  }
}

export class PeerError extends Error {
  constructor(
    readonly state: 'unreachable' | 'refused' | 'failed',
    message: string,
  ) {
    super(message)
  }
}

export interface WireSocket {
  call(request: WireRequest, timeout?: number): Promise<unknown>
  ready(): Promise<void>
  close(): void
}

interface Waiting {
  resolve(result: unknown): void
  reject(error: Error): void
  timer: Timer
}

export const longCall = 10 * 60_000

const openTimeout = 10_000

const opened = (socket: WebSocket) =>
  new Promise<WebSocket>((resolve, reject) => {
    const fail = (error: SocketError) => {
      clearTimeout(timer)
      socket.close()
      reject(error)
    }
    const timer = setTimeout(() => fail(new SocketError('timeout')), openTimeout)
    socket.onopen = () => {
      clearTimeout(timer)
      resolve(socket)
    }
    socket.onerror = () => fail(new SocketError('failed'))
    socket.onclose = () => fail(new SocketError('closed'))
  })

export const wireSocket = (address: () => Promise<string>): WireSocket => {
  const waiting = new Map<number, Waiting>()
  let next = 0
  let closed = false
  let current: Promise<WebSocket> | undefined

  const settle = (id: number, error?: Error, result?: unknown) => {
    const entry = waiting.get(id)
    if (!entry) return
    waiting.delete(id)
    clearTimeout(entry.timer)
    if (error) entry.reject(error)
    else entry.resolve(result)
  }

  const failAll = (error: Error) => {
    for (const id of [...waiting.keys()]) settle(id, error)
  }

  const receive = (data: unknown) => {
    let message: ServerMessage
    try {
      message = JSON.parse(String(data)) as ServerMessage
    } catch {
      return
    }
    if (message.type !== 'result') return
    if (message.error) settle(message.id, new PeerError('failed', message.error))
    else settle(message.id, undefined, message.result)
  }

  const connect = async () => {
    const socket = await opened(new WebSocket(await address()))
    if (closed) {
      socket.close()
      throw new SocketError('closed')
    }
    socket.onmessage = event => receive(event.data)
    socket.onclose = () => {
      current = undefined
      failAll(new SocketError('closed'))
    }
    return socket
  }

  const open = () =>
    (current ??= connect().catch(error => {
      current = undefined
      throw error
    }))

  return {
    call(request, timeout = 15_000) {
      if (closed) return Promise.reject(new SocketError('closed'))
      const id = ++next
      return new Promise((resolve, reject) => {
        waiting.set(id, { resolve, reject, timer: setTimeout(() => settle(id, new SocketError('timeout')), timeout) })
        open().then(
          socket => waiting.has(id) && socket.send(JSON.stringify({ ...request, id })),
          error => settle(id, error),
        )
      })
    },
    ready: () => (closed ? Promise.reject(new SocketError('closed')) : open().then(() => undefined)),
    close() {
      closed = true
      failAll(new SocketError('closed'))
      void current?.then(socket => socket.close(), () => {})
    },
  }
}

export const askOnce = async (address: () => Promise<string>, request: WireRequest, timeout?: number, sockets = new Set<WireSocket>()) => {
  const socket = wireSocket(address)
  sockets.add(socket)
  try {
    return await socket.call(request, timeout)
  } finally {
    sockets.delete(socket)
    socket.close()
  }
}
