import type { DeviceInfo, DeviceKind, PairRequest } from '@sand/protocol'
import type { Dispose } from 'drydock'

export type { PairBack, PairInvite, PairRequest, PairResult } from '@sand/protocol'

export interface PairedDevice {
  id: string
  name: string
  kind: DeviceKind
  added: number
  lastSeen: number
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
