import type { SocketHandlers, TransportSocket } from '@sand/devices-contract'
import { TimedOut } from '../../errors/timed-out'
import { Unreachable } from '../../errors/unreachable'
import { seconds } from '../../time/seconds'

const socketUrl = (base: string, path: string) => {
  const url = new URL(path, base)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.href
}

export const openDirectSocket = (base: string, path: string, handlers: SocketHandlers, timeout: number) =>
  new Promise<TransportSocket>((resolve, reject) => {
    const socket = new WebSocket(socketUrl(base, path))
    let opened = false
    const timer = setTimeout(() => {
      reject(new TimedOut(`${base} didn't open a socket within ${seconds(timeout)}`))
      socket.close()
    }, timeout)

    socket.addEventListener('open', () => {
      clearTimeout(timer)
      opened = true
      resolve({ send: data => socket.send(data), close: () => socket.close() })
    })
    socket.addEventListener('message', event => handlers.message(String(event.data)))
    socket.addEventListener('close', event => {
      clearTimeout(timer)
      if (opened) handlers.closed(event.reason || `socket closed (${event.code})`)
      else reject(new Unreachable(`${base} refused the socket`))
    })
  })
