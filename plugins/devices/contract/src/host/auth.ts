import type { Caller } from '@sand/host-hub/contract'
import { type Dispose, service } from 'drydock'

export type AuthRefusal = { reason: 'removed'; at: number; by: string } | { reason: 'unknown' }

export type AuthVerdict = { ok: true; caller: Caller; name: string } | ({ ok: false } & AuthRefusal)

export interface Auth {
  identify(publicKey: string, local: boolean): AuthVerdict
  onRevoke(listener: (device: string) => void): Dispose
}

export const auth = service<Auth>('auth')
