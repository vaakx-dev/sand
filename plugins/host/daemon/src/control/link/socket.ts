import { deviceParams, devicePaths } from '@sand/devices-contract'
import type { ClientMessage, ServerMessage } from '@sand/host-hub/contract'
import { isRecord, trimSlash } from '@sand/util'

const openTimeout = 5000

export interface SocketHandlers {
  result(id: number, result: unknown, error?: string): void
  event(name: string, payload: unknown): void
  closed(): void
}

export interface DaemonSocket {
  send(message: ClientMessage): void
  close(): void
}

const socketUrl = (url: string, ticket: string) =>
  `${trimSlash(url).replace(/^http/, 'ws')}${devicePaths.socket}?${deviceParams.ticket}=${encodeURIComponent(ticket)}`

const json = (raw: string): unknown => {
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

const parse = (raw: string): ServerMessage | undefined => {
  const value = json(raw)
  if (!isRecord(value)) return undefined
  if (value.type === 'event' && typeof value.name === 'string') return { type: 'event', name: value.name, payload: value.payload }
  if (value.type !== 'result' || typeof value.id !== 'number') return undefined
  return { type: 'result', id: value.id, result: value.result, ...(typeof value.error === 'string' && { error: value.error }) }
}

const opened = (socket: WebSocket) =>
  new Promise<void>((resolve, reject) => {
    const fail = () => {
      clearTimeout(timer)
      socket.close()
      reject(new Error('could not reach sand'))
    }
    const timer = setTimeout(fail, openTimeout)
    socket.onopen = () => {
      clearTimeout(timer)
      resolve()
    }
    socket.onerror = fail
    socket.onclose = fail
  })

export const openSocket = async (url: string, ticket: string, handlers: SocketHandlers): Promise<DaemonSocket> => {
  const socket = new WebSocket(socketUrl(url, ticket))
  await opened(socket)
  socket.onerror = null
  socket.onclose = () => handlers.closed()
  socket.onmessage = ({ data }) => {
    const message = parse(String(data))
    if (message?.type === 'result') handlers.result(message.id, message.result, message.error)
    else if (message?.type === 'event') handlers.event(message.name, message.payload)
  }
  return {
    send: message => socket.send(JSON.stringify(message)),
    close: () => socket.close(),
  }
}
