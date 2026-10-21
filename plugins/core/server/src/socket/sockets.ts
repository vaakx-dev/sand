import type { Caller, ClientMessage, ServerMessage } from '@sand/host-hub/contract'
import { errorMessage } from '@sand/util'
import type { ServerWebSocket, WebSocketHandler } from 'bun'
import { serialize } from './serialize'

export type Socket = ServerWebSocket<Caller>

export interface SocketHandlers {
  leave(socket: Socket): void
  answer(socket: Socket, request: ClientMessage): Promise<unknown>
  settle(): void
  malformed(error: unknown): void
}

export const deliver = (socket: Socket, payload: string) => {
  if (socket.send(payload) === 0) socket.terminate()
}

const send = (socket: Socket, payload: ServerMessage) => deliver(socket, JSON.stringify(payload))

export const eventFrame = (name: string, payload: unknown) => JSON.stringify({ type: 'event', name, payload: serialize(payload) } satisfies ServerMessage)

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

  const broadcast = (name: string, payload: unknown) => {
    const frame = eventFrame(name, payload)
    for (const client of clients) deliver(client, frame)
  }

  const publish = (frame: string, to: (socket: Socket) => boolean) => {
    for (const client of clients) if (to(client)) deliver(client, frame)
  }

  const websocket: WebSocketHandler<Caller> = {
    maxPayloadLength: 64 * 1024 * 1024,
    open(socket) {
      clients.add(socket)
    },
    close(socket) {
      clients.delete(socket)
      handlers.leave(socket)
    },
    message: (socket, data) => void receive(socket, String(data)),
  }

  return { broadcast, publish, websocket }
}
