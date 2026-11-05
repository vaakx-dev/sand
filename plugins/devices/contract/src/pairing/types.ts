import type { DeviceRecord, JoinKind } from '../records'
import type { ShareLink } from './links'

export type JoinOutcome = 'approved' | 'denied' | 'expired'

export interface JoinRequest {
  id: string
  pc: string
  pcName: string
  code: string
  name: string
  kind: JoinKind
  platform: string
  address: string
  created: number
  expires: number
}

export interface PairSettled {
  id: string
  pc: string
  outcome: JoinOutcome
  by?: string
  device?: DeviceRecord
}

export interface PairJoined {
  token: string
  device: DeviceRecord
}

export interface OutgoingJoin {
  id: string
  pc: string
  name: string
  code: string
  url: string
  expires: number
}

export type OutgoingOutcome = JoinOutcome | 'failed' | 'cancelled'

export interface PairJoinResult {
  id: string
  pc: string
  outcome: OutgoingOutcome
  error?: string
}

export interface AgentPairing {
  device: DeviceRecord
  token: string
  links: ShareLink[]
}
