import { type Dispose, service } from 'drydock'
import type { DevicePush, DeviceRecord, NewDevice } from '../records'
import type { AgentAccess, PcIcon } from '../schemas'

export interface AddedKey {
  publicKey: string
  origin?: string
}

export interface NewAgent {
  name: string
  access: AgentAccess
}

export interface AddedAgent {
  device: DeviceRecord
  token: string
}

export interface Registry {
  list(): DeviceRecord[]
  all(): DeviceRecord[]
  get(id: string): DeviceRecord | undefined
  byKey(publicKey: string): DeviceRecord | undefined
  add(device: NewDevice, by: string): Promise<DeviceRecord>
  addKey(id: string, key: AddedKey, by: string): Promise<DeviceRecord>
  addAgent(agent: NewAgent, by: string): Promise<AddedAgent>
  rename(id: string, name: string, by: string): Promise<DeviceRecord>
  setIcon(id: string, icon: PcIcon): Promise<DeviceRecord>
  setDetectedIcon(id: string, icon: PcIcon): Promise<DeviceRecord>
  setPush(id: string, push: DevicePush | undefined): Promise<DeviceRecord>
  remove(id: string, by: string): Promise<void>
  merge(records: DeviceRecord[]): Promise<DeviceRecord[]>
  onChange(listener: (changed: DeviceRecord[]) => void): Dispose
}

export const registry = service<Registry>('registry')
