import type { BuildInfo } from '@sand/host-dist/contract'
import { event, service } from 'drydock'
import type { RoutePrefs } from '../connection/routes'
import type { ConnectionStatus, Diagnosis } from '../connection/status'
import type { JoinTicket, PairRefusalReason } from '../http/pair'
import type { DeviceRecord } from '../records'

export interface PcView {
  id: string
  name: string
  platform?: string
  home: boolean
  online: boolean
  status: ConnectionStatus
  address?: string
  build?: BuildInfo
  seen?: number
}

export type PagePairing =
  | { phase: 'checking' }
  | { phase: 'paired'; device: DeviceRecord }
  | { phase: 'unpaired'; refused?: PairRefusalReason }
  | { phase: 'redeeming' }
  | { phase: 'requesting'; request: JoinTicket }
  | { phase: 'denied' }
  | { phase: 'expired' }
  | { phase: 'removed'; at?: number; by?: string }
  | { phase: 'failed'; error: string }

export type PagePairingPhase = PagePairing['phase']

export interface Pcs {
  self(): string | undefined
  here(): PcView
  list(): PcView[]
  get(id: string): PcView | undefined
  name(id: string): string
  online(id: string): boolean
  diagnosis(id: string): Diagnosis | undefined
  retry(id?: string): void
  setRoutePrefs(id: string, prefs: RoutePrefs): void
  addRoute(id: string, url: string): void
  removeRoute(id: string, key: string): void
  pairing(): PagePairing
  requestJoin(): Promise<JoinTicket>
  approval(): string | undefined
  dismissApproval(): void
}

export const pcs = service<Pcs>('pcs')

export const pcsChange = event<() => void>('pcs.change')
export const pcHello = event<(pc: string, retagged: boolean) => void>('pc.hello')
