import type { RelayEvents, ServerMessage, Session } from '@sand/protocol'
import type { ServerWebSocket } from 'bun'

export type Socket = ServerWebSocket<unknown>

export interface Peer {
  socket: Socket
  focus?: Session
}

export const tell = <K extends keyof RelayEvents>(peer: Peer, name: K, ...args: RelayEvents[K]) =>
  void peer.socket.send(JSON.stringify({ type: 'event', name, args } satisfies ServerMessage))
