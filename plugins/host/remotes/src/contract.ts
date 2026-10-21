import type { DeviceInfo, PairBack, PairedDevice } from '@sand/host-devices/contract'
import { request, type, wireEvent } from '@sand/host-hub/contract'
import { service } from 'drydock'
import { z } from 'zod'

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

export const hostRemotes = service<HostRemotes>('hostRemotes')

const pc = z.string().min(1)

export const remotesList = request('remotes.list', { input: z.object({}), output: type<Remote[]>() })
export const remotesAdd = request('remotes.add', { input: z.object({ link: z.string() }), output: type<Remote>() })
export const remotesRemove = request('remotes.remove', { input: z.object({ remote: pc }), output: type<void>() })
export const remotesInvite = request('remotes.invite', { input: z.object({ remote: pc }), output: type<RemoteInvite>() })
export const pcsList = request('pcs.list', { input: z.object({}), output: type<PcList>() })
export const pcsRemove = request('pcs.remove', { input: z.object({ pc }), output: type<PcList>() })

export const remotesChange = wireEvent<Remote[]>('remotes.change')
export const pcsChange = wireEvent<PcList>('pcs.change')
