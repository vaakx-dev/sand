import type { PairedDevice } from './devices'
import type { DeviceInfo } from './remotes'

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
