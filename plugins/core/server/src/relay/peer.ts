import type { SessionSettings } from '@sand/model/contract'
import type { ServerMessage } from '@sand/protocol'
import type { Session } from '@sand/sessions-sqlite/contract'
import { AsyncLocalStorage } from 'node:async_hooks'
import type { RelayEvents } from '../contract'
import type { Socket } from '../socket/sockets'

export interface Peer {
  socket: Socket
  focus?: Session
}

export interface Invocation {
  peer: Peer
  session?: Session
  cwd?: string
  settings?: SessionSettings
}

export const invocation = new AsyncLocalStorage<Invocation>()

export const tell = <K extends keyof RelayEvents>(peer: Peer, name: K, ...args: RelayEvents[K]) =>
  void peer.socket.send(JSON.stringify({ type: 'event', name, args } satisfies ServerMessage))
