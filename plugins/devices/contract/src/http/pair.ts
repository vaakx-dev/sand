import type { ShareLink } from '../pairing/links'
import type { DeviceKind, DeviceRecord, PcIdentity } from '../records'

export interface PairBody {
  token: string
  publicKey: string
  name: string
  kind: DeviceKind
  platform: string
}

export interface PairReply {
  device: DeviceRecord
  pc: PcIdentity
}

export type PairRefusalReason = 'invalid' | 'wrong-kind' | 'removed'

export interface PairRefusal {
  reason: PairRefusalReason
}

export interface JoinBody {
  publicKey: string
  name: string
  kind: DeviceKind
  platform: string
}

export interface JoinTicket {
  id: string
  code: string
  expires: number
  approve: ShareLink[]
}

export type JoinPhase = 'pending' | 'approved' | 'denied' | 'expired'

export type JoinStatus =
  | { phase: 'pending'; expires: number }
  | { phase: 'approved'; device: DeviceRecord; pc: PcIdentity }
  | { phase: 'denied' }
  | { phase: 'expired' }

export type JoinRefusalReason = 'not-private' | 'rate-limited' | 'already-paired'

export interface JoinRefusal {
  reason: JoinRefusalReason
}
