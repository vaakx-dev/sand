import type { Caller } from '@sand/host-hub/contract'
import { type Dispose, service } from 'drydock'
import type { AgentAccess } from '../schemas'

export type AuthRefusal = { reason: 'removed'; at: number; by: string } | { reason: 'unknown' }

export type AuthVerdict = { ok: true; caller: Caller; name: string } | ({ ok: false } & AuthRefusal)

export interface AgentVerdict {
  caller: Caller
  name: string
  access: AgentAccess
}

export interface Auth {
  identify(publicKey: string, local: boolean): AuthVerdict
  agent(token: string): AgentVerdict | undefined
  onRevoke(listener: (device: string) => void): Dispose
}

export const auth = service<Auth>('auth')
