import type { BuildInfo } from '@sand/host-dist/contract'
import type { DeviceKind } from '@sand/host-gateway/contract'
import { request, type, wireEvent } from '@sand/host-hub/contract'
import { service, type Dispose } from 'drydock'
import { z } from 'zod'

export interface DeviceInfo {
  id: string
  name: string
  platform: string
  build?: BuildInfo
}

export interface HostIdentity {
  deviceId: string
  name: string
  build?: BuildInfo
}

export interface Ticket {
  ticket: string
  expires: number
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

export interface PairUsed {
  device: PairedDevice
  expires: number
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

export const hostDevices = service<HostDevices>('hostDevices')

export const deviceInfo = request('device.info', { input: z.object({}), output: type<DeviceInfo>() })
export const devicesList = request('devices.list', { input: z.object({}), output: type<PairedDevice[]>() })
export const devicesRename = request('devices.rename', { input: z.object({ device: z.string(), name: z.string() }), output: type<PairedDevice>() })
export const devicesRemove = request('devices.remove', { input: z.object({ device: z.string() }), output: type<void>() })

export const pairUsed = wireEvent<PairUsed>('pair.used')
export const devicesChange = wireEvent<PairedDevice[]>('devices.change')
