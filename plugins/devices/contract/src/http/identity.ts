import type { PcIdentity } from '../records'

export interface IdentityReply extends PcIdentity {
  nonce: string
  signature: string
  signedSocket?: boolean
}

export interface Resume {
  nonce: string
  expires: number
}

export interface TicketBody {
  publicKey: string
  nonce: string
  signature: string
}

export interface TicketGrant {
  ticket: string
  expires: number
}

export type TicketRefusalReason = 'removed' | 'unknown' | 'nonce'

export interface TicketRefusal {
  reason: TicketRefusalReason
  at?: number
  by?: string
}
