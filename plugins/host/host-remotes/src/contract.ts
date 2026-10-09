import type { PairBack, PairedDevice } from '@sand/host-devices/contract'
import type { DeviceInfo } from '@sand/protocol'

export interface Remote extends DeviceInfo {
  url: string
  urls: string[]
}

export interface RemoteRecord extends Remote {
  key: string
}

export interface RemoteInvite {
  secret: string
  url: string
}

export type PcPairing = 'paired' | 'incomplete' | 'refused'

export interface PcInfo {
  id: string
  name: string
  platform?: string
  pairing: PcPairing
  online: boolean
  checked: boolean
  lastSeen?: number
  added?: number
  url?: string
  error?: string
}

export interface PcList {
  self: DeviceInfo
  pcs: PcInfo[]
  devices: PairedDevice[]
}

export interface HostRemotes {
  list(): Remote[]
  add(link: string): Promise<Remote>
  accept(back: PairBack, address?: string): Promise<boolean>
}

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'remotes.list': {}
    'remotes.add': { link: string }
    'remotes.remove': { remote: string }
    'remotes.invite': { remote: string }
    'pcs.list': {}
    'pcs.remove': { pc: string }
  }

  interface WireEvents {
    'remotes.change': [remotes: Remote[]]
    'pcs.change': [list: PcList]
  }
}

declare module 'drydock' {
  interface Services {
    hostRemotes: HostRemotes
  }
}
