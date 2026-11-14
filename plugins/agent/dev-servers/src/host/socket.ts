import type { ServerWebSocket } from 'bun'

type Message = string | ArrayBuffer | Uint8Array

interface Bridge {
  attach(visitor: ServerWebSocket<Bridge>): void
  send(message: string | Uint8Array<ArrayBuffer>): void
  close(code: number, reason: string): void
}

const CONNECT_TIMEOUT_MS = 10_000
const NORMAL_CLOSE = 1000

const sendable = (code: number) => (code === NORMAL_CLOSE || (code >= 3000 && code <= 4999) ? code : NORMAL_CLOSE)

const upstreamSocket = (target: URL, protocols: string[]) =>
  new Promise<WebSocket | undefined>(resolve => {
    const socket = new WebSocket(target.href, protocols)
    socket.binaryType = 'arraybuffer'
    const timer = setTimeout(() => {
      socket.close()
      resolve(undefined)
    }, CONNECT_TIMEOUT_MS)
    socket.addEventListener('open', () => {
      clearTimeout(timer)
      resolve(socket)
    })
    socket.addEventListener('error', () => {
      clearTimeout(timer)
      resolve(undefined)
    })
  })

const bridgeOf = (upstream: WebSocket): Bridge => {
  const early: Message[] = []
  let visitor: ServerWebSocket<Bridge> | undefined
  let closed: { code: number; reason: string } | undefined

  upstream.addEventListener('message', event => {
    const message: Message = event.data
    if (visitor) visitor.send(message)
    else early.push(message)
  })
  upstream.addEventListener('close', event => {
    closed = { code: sendable(event.code), reason: event.reason }
    visitor?.close(closed.code, closed.reason)
  })

  return {
    attach(socket) {
      visitor = socket
      for (const message of early.splice(0)) socket.send(message)
      if (closed) socket.close(closed.code, closed.reason)
    },
    send: message => upstream.send(message),
    close: (code, reason) => upstream.close(sendable(code), reason),
  }
}

export { bridgeOf, upstreamSocket, type Bridge }
