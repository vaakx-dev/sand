import type { SocketHandlers, SocketInit, TransportSocket } from '@sand/devices-contract'
import { TimedOut } from '../../errors/timed-out'
import { Unreachable } from '../../errors/unreachable'
import { seconds } from '../../time/seconds'

const socketUrl = (base: string, path: string) => {
  const url = new URL(path, base)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.href
}

export const openDirectSocket = (base: string, path: string, handlers: SocketHandlers, { timeout, signal }: SocketInit) =>
  new Promise<TransportSocket>((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason)
    const socket = new WebSocket(socketUrl(base, path))
    let opened = false

    const settle = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', abandon)
    }
    const fail = (error: unknown) => {
      settle()
      reject(error)
      socket.close()
    }
    const abandon = () => fail(signal.reason)
    const timer = setTimeout(() => fail(new TimedOut(`${base} didn't open a socket within ${seconds(timeout)}`)), timeout)
    signal.addEventListener('abort', abandon, { once: true })

    socket.addEventListener('open', () => {
      settle()
      opened = true
      resolve({ send: data => socket.send(data), close: () => socket.close() })
    })
    socket.addEventListener('message', event => handlers.message(String(event.data)))
    socket.addEventListener('close', event => {
      settle()
      if (opened) handlers.closed(event.reason || `socket closed (${event.code})`)
      else reject(new Unreachable(`${base} refused the socket`))
    })
  })
