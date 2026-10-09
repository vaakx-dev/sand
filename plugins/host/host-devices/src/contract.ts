import type { DeviceInfo, DeviceKind } from '@sand/protocol'
import type { Dispose } from 'drydock'

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

export interface DeviceRemoval {
  device: PairedDevice
  told: boolean
}

export interface HostDevices {
  list(): PairedDevice[]
  get(id: string): PairedDevice | undefined
  verify(key: string): PairedDevice | undefined
  invite(): { secret: string; expires: number }
  redeem(request: PairRequest): Promise<{ device: PairedDevice; key: string } | undefined>
  mint(peer: DeviceInfo): Promise<string>
  link(id: string, peer: DeviceInfo): Promise<PairedDevice | undefined>
  rename(id: string, name: string): Promise<PairedDevice>
  remove(id: string, options?: { told?: boolean }): Promise<void>
  onChange(listener: (removed?: DeviceRemoval) => void): Dispose
}

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'device.info': {}
    'devices.list': {}
    'devices.rename': { device: string; name: string }
    'devices.remove': { device: string }
  }

  interface WireEvents {
    'pair.used': [device: PairedDevice, inviteExpires: number]
    'devices.change': [devices: PairedDevice[]]
  }
}

declare module 'drydock' {
  interface Services {
    hostDevices: HostDevices
  }
}
