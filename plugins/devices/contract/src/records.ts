import type { BuildInfo } from '@sand/host-dist/contract'
import type { CallerKind } from '@sand/host-hub/contract'

export type DeviceKind = Exclude<CallerKind, 'cli' | 'runtime'>

export interface DeviceKey {
  publicKey: string
  added: number
  origin?: string
}

export interface Removal {
  at: number
  by: string
}

export interface DeviceRecord {
  id: string
  kind: DeviceKind
  name: string
  platform?: string
  keys: DeviceKey[]
  added: number
  addedBy: string
  updated: number
  removed?: Removal
}

export interface NewDevice {
  kind: DeviceKind
  name: string
  platform?: string
  publicKey: string
  origin?: string
}

export interface PcIdentity {
  id: string
  name: string
  platform: string
  publicKey: string
  build?: BuildInfo
}

export interface KeyPair {
  publicKey: string
  secretKey: string
}
