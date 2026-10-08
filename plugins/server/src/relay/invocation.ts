import type { Session, SessionSettings } from '@sand/protocol'
import { AsyncLocalStorage } from 'node:async_hooks'
import type { Peer } from './peer'

export interface Invocation {
  peer: Peer
  session?: Session
  cwd?: string
  settings?: SessionSettings
}

export const invocation = new AsyncLocalStorage<Invocation>()
