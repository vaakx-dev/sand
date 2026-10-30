import { type Dispose, service } from 'drydock'
import type { DeviceRecord, NewDevice } from '../records'

export interface AddedKey {
  publicKey: string
  origin?: string
}

export interface Registry {
  list(): DeviceRecord[]
  all(): DeviceRecord[]
  get(id: string): DeviceRecord | undefined
  byKey(publicKey: string): DeviceRecord | undefined
  add(device: NewDevice, by: string): Promise<DeviceRecord>
  addKey(id: string, key: AddedKey, by: string): Promise<DeviceRecord>
  rename(id: string, name: string, by: string): Promise<DeviceRecord>
  remove(id: string, by: string): Promise<void>
  merge(records: DeviceRecord[]): Promise<DeviceRecord[]>
  onChange(listener: (changed: DeviceRecord[]) => void): Dispose
}

export const registry = service<Registry>('registry')
