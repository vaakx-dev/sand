import type { BuildInfo, DeviceInfo } from './remotes'

export type DeviceKind = 'pc' | 'phone' | 'browser'

export interface PairedDevice {
  id: string
  name: string
  kind: DeviceKind
  added: number
  lastSeen: number
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

export interface PairLinkRequest {
  device: DeviceInfo
  urls: string[]
  key?: string
}

export interface PairLinkResult {
  device: DeviceInfo
  accepts: boolean
}

export interface PairInvite {
  secret: string
  expires: number
  links: string[]
}

export interface Ticket {
  ticket: string
  expires: number
}

export interface NetworkState {
  lan: boolean
  urls: string[]
}

export interface RemoteInvite {
  secret: string
  url: string
}

export type RouteKind = 'local' | 'lan' | 'tailscale'

export interface HostRoute {
  url: string
  kind: RouteKind
}

export interface HostIdentity {
  deviceId: string
  name: string
  version: string
  build?: BuildInfo
}

export interface TailscaleState {
  installed: boolean
  running: boolean
  name?: string
  ip?: string
  https: boolean
  serving: boolean
  httpsUrl?: string
  error?: string
}
