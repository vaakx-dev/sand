import type { RuntimeView } from '@sand/protocol'
import { upstreamSocketUrl } from '../../runtime/channel'

const retryDelay = 1000

export interface UpstreamHandlers {
  message(raw: string): void
  lost(): void
  alive(): boolean
}

export interface Upstream {
  send(raw: string): void
  close(): void
}

export const createUpstream = (runtime: RuntimeView, handlers: UpstreamHandlers): Upstream => {
  const backlog: string[] = []
  let closed = false
  let retry: Timer | undefined
  let socket: WebSocket

  const connect = () => {
    const opened = new WebSocket(upstreamSocketUrl(runtime.url, runtime.secret))
    socket = opened
    opened.addEventListener('open', () => {
      for (const raw of backlog.splice(0)) opened.send(raw)
    })
    opened.addEventListener('message', event => handlers.message(String(event.data)))
    opened.addEventListener('close', () => {
      if (closed || socket !== opened) return
      handlers.lost()
      if (handlers.alive()) retry = setTimeout(connect, retryDelay)
    })
  }

  connect()

  return {
    send(raw) {
      if (socket.readyState === WebSocket.OPEN) socket.send(raw)
      else backlog.push(raw)
    },
    close() {
      closed = true
      clearTimeout(retry)
      backlog.length = 0
      socket.close()
    },
  }
}
