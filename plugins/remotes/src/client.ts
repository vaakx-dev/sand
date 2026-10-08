import type { RemoteClient, ServerMessage } from '@sand/protocol'
import { socketUrl } from '@sand/kit'
import type { Link } from './link'

type Listener = (name: string, args: unknown[]) => void

interface Waiting {
  resolve(value: unknown): void
  reject(error: Error): void
}

export const connectRemote = (link: Link, timeout = 5000) =>
  new Promise<RemoteClient>((resolve, reject) => {
    const socket = new WebSocket(socketUrl(link.url, link.token))
    const pending = new Map<number, Waiting>()
    const listeners = new Set<Listener>()
    let next = 0
    let opened = false
    const timer = setTimeout(() => socket.close(), timeout)

    const client: RemoteClient = {
      call: request =>
        new Promise((resolveCall, rejectCall) => {
          if (socket.readyState !== WebSocket.OPEN) return rejectCall(new Error(`Lost the connection to ${link.url}`))
          const id = ++next
          pending.set(id, { resolve: resolveCall as Waiting['resolve'], reject: rejectCall })
          socket.send(JSON.stringify({ ...request, id }))
        }),
      listen(listener) {
        listeners.add(listener)
        return () => void listeners.delete(listener)
      },
      close: () => socket.close(),
    }

    socket.onopen = () => {
      opened = true
      clearTimeout(timer)
      resolve(client)
    }
    socket.onmessage = event => {
      const message = JSON.parse(String(event.data)) as ServerMessage
      if (message.type === 'event') return listeners.forEach(listener => listener(message.name, message.args))
      const waiting = pending.get(message.id)
      pending.delete(message.id)
      if (message.error !== undefined) waiting?.reject(new Error(message.error))
      else waiting?.resolve(message.result)
    }
    socket.onclose = () => {
      clearTimeout(timer)
      for (const waiting of pending.values()) waiting.reject(new Error(`Lost the connection to ${link.url}`))
      pending.clear()
      if (!opened) reject(new Error(`Could not reach ${link.url}`))
    }
  })
