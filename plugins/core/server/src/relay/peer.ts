import type { ServerMessage } from '@sand/protocol'
import type { Session } from '@sand/sessions-sqlite/contract'
import type { RelayEvents } from '../contract'
import type { ServerWebSocket } from 'bun'

export type Socket = ServerWebSocket<unknown>

export interface Peer {
  socket: Socket
  focus?: Session
}

export const tell = <K extends keyof RelayEvents>(peer: Peer, name: K, ...args: RelayEvents[K]) =>
  void peer.socket.send(JSON.stringify({ type: 'event', name, args } satisfies ServerMessage))
