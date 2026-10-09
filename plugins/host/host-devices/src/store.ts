import { writePrivateJson } from '@sand/kit/fs'
import type { DeviceKind } from '@sand/protocol'
import { join } from 'node:path'
import type { PairedDevice } from './contract'

export interface DeviceRecord extends PairedDevice {
  keyHash: string
}

export const deviceKinds: DeviceKind[] = ['pc', 'phone', 'browser']

const isRecord = (value: unknown): value is DeviceRecord => {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    deviceKinds.includes(record.kind as DeviceKind) &&
    typeof record.keyHash === 'string' &&
    typeof record.added === 'number' &&
    typeof record.lastSeen === 'number'
  )
}

const pick = ({ id, name, kind, keyHash, added, lastSeen }: DeviceRecord): DeviceRecord => ({ id, name, kind, keyHash, added, lastSeen })

const read = async (file: string) => {
  try {
    const saved = await Bun.file(file).json()
    return Array.isArray(saved) ? saved.filter(isRecord).map(pick) : []
  } catch {
    return []
  }
}

export const loadDeviceStore = async (home: string) => {
  const file = join(home, 'devices.json')
  const records = await read(file)
  let saving: Promise<void> = Promise.resolve()
  return {
    records: () => records,
    add: (record: DeviceRecord) => records.push(record),
    delete(id: string) {
      const index = records.findIndex(record => record.id === id)
      if (index >= 0) records.splice(index, 1)
      return index >= 0
    },
    save() {
      const next = saving.catch(() => {}).then(() => writePrivateJson(file, records))
      saving = next
      return next
    },
  }
}

export type DeviceStore = Awaited<ReturnType<typeof loadDeviceStore>>
