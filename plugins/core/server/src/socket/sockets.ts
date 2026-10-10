import type { ClientMessage, ServerMessage } from '@sand/protocol'
import { errorMessage } from '@sand/kit'
import type { ServerWebSocket, WebSocketHandler } from 'bun'
import { serialize } from './serialize'

export type Socket = ServerWebSocket<unknown>

export interface SocketHandlers {
  join(socket: Socket): void
  leave(socket: Socket): void
  answer(socket: Socket, request: ClientMessage): Promise<unknown>
  settle(): void
  malformed(error: unknown): void
}

const send = (socket: Socket, payload: ServerMessage) => socket.send(JSON.stringify(payload))

const parse = (raw: string) => {
  const request = JSON.parse(raw) as ClientMessage
  if (typeof request?.id !== 'number' || typeof request.type !== 'string') throw new Error('The request has no id or type')
  return request
}

export const createSockets = (handlers: SocketHandlers) => {
  const clients = new Set<Socket>()

  const receive = async (socket: Socket, raw: string) => {
    let request: ClientMessage
    try {
      request = parse(raw)
    } catch (error) {
      return handlers.malformed(new Error(`Dropped a malformed frame: ${errorMessage(error)}`))
    }
    let message: ServerMessage
    try {
      message = { type: 'result', id: request.id, result: serialize(await handlers.answer(socket, request)) }
    } catch (error) {
      message = { type: 'result', id: request.id, error: errorMessage(error) }
    }
    handlers.settle()
    send(socket, message)
  }

  const broadcast = (name: string, args: unknown[]) => {
    const payload = JSON.stringify({ type: 'event', name, args: serialize(args) as unknown[] } satisfies ServerMessage)
    for (const client of clients) client.send(payload)
  }

  const publish = (payload: string, to: (socket: Socket) => boolean) => {
    for (const client of clients) if (to(client)) client.send(payload)
  }

  const websocket: WebSocketHandler<unknown> = {
    maxPayloadLength: 64 * 1024 * 1024,
    open(socket) {
      clients.add(socket)
      handlers.join(socket)
    },
    close(socket) {
      clients.delete(socket)
      handlers.leave(socket)
    },
    message: (socket, data) => void receive(socket, String(data)),
  }

  return { broadcast, publish, websocket }
}
