import type { SessionSettings } from '@sand/model/contract'
import type { Session } from '@sand/sessions-sqlite/contract'
import { AsyncLocalStorage } from 'node:async_hooks'
import type { Peer } from './peer'

export interface Invocation {
  peer: Peer
  session?: Session
  cwd?: string
  settings?: SessionSettings
}

export const invocation = new AsyncLocalStorage<Invocation>()
