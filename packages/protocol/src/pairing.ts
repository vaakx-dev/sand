import type { BuildInfo, DeviceInfo } from './host'
import type { DeviceKind } from './server'

export interface Remote extends DeviceInfo {
  url: string
  urls: string[]
}

export interface RemoteRecord extends Remote {
  key: string
}

export type RouteKind = 'local' | 'lan' | 'tailscale'

export interface Ticket {
  ticket: string
  expires: number
}

export interface HostIdentity {
  deviceId: string
  name: string
  version: string
  build?: BuildInfo
}

export interface PairBack {
  device: DeviceInfo
  urls: string[]
  key: string
}

export interface PairRequest {
  secret: string
  name: string
  kind: DeviceKind
  back?: PairBack
}

export interface PairResult {
  deviceId: string
  key: string
  host: DeviceInfo
  urls: string[]
  back?: boolean
}

export interface PairInvite {
  secret: string
  expires: number
  links: string[]
}
