import { isRecord, serial } from '@sand/kit'
import { writePrivateJson } from '@sand/kit/fs'
import type { DeviceKind } from '@sand/protocol'
import { join } from 'node:path'
import type { PairedDevice } from './contract'

export interface DeviceRecord extends PairedDevice {
  keyHash: string
}

export const deviceKinds: DeviceKind[] = ['pc', 'phone', 'browser']

const isDevice = (value: unknown): value is DeviceRecord =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  deviceKinds.includes(value.kind as DeviceKind) &&
  typeof value.keyHash === 'string' &&
  typeof value.added === 'number' &&
  typeof value.lastSeen === 'number'

const pick = ({ id, name, kind, keyHash, added, lastSeen }: DeviceRecord): DeviceRecord => ({ id, name, kind, keyHash, added, lastSeen })

const read = async (file: string) => {
  try {
    const saved = await Bun.file(file).json()
    return Array.isArray(saved) ? saved.filter(isDevice).map(pick) : []
  } catch {
    return []
  }
}

export const loadDeviceStore = async (home: string) => {
  const file = join(home, 'devices.json')
  const records = await read(file)
  const queue = serial()
  return {
    records: () => records,
    add: (record: DeviceRecord) => records.push(record),
    delete(id: string) {
      const index = records.findIndex(record => record.id === id)
      if (index >= 0) records.splice(index, 1)
      return index >= 0
    },
    save: () => queue(() => writePrivateJson(file, records)),
  }
}

export type DeviceStore = Awaited<ReturnType<typeof loadDeviceStore>>
