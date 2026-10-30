import type { DeviceKey, DeviceRecord } from '@sand/devices-contract'
import { deviceIdOf } from '@sand/devices-identity'

const normalKey = ({ publicKey, added, origin }: DeviceKey): DeviceKey => ({ publicKey, added, ...(origin !== undefined && { origin }) })

export const normalRecord = (record: DeviceRecord): DeviceRecord => ({
  id: record.id,
  kind: record.kind,
  name: record.name,
  ...(record.platform !== undefined && { platform: record.platform }),
  keys: record.keys.map(normalKey),
  added: record.added,
  addedBy: record.addedBy,
  updated: record.updated,
  ...(record.removed && { removed: { at: record.removed.at, by: record.removed.by } }),
})

export const isSound = (record: DeviceRecord) => {
  const first = record.keys[0]
  if (!first) return false
  try {
    return deviceIdOf(first.publicKey) === record.id
  } catch {
    return false
  }
}

const winner = (local: DeviceRecord, incoming: DeviceRecord) => {
  if (incoming.updated !== local.updated) return incoming.updated > local.updated ? incoming : local
  return incoming.removed && !local.removed ? incoming : local
}

const unionKeys = (first: DeviceKey[], second: DeviceKey[]) => [...first, ...second.filter(key => !first.some(known => known.publicKey === key.publicKey))]

const same = (a: DeviceRecord, b: DeviceRecord) => JSON.stringify(a) === JSON.stringify(b)

export const mergeRecord = (local: DeviceRecord | undefined, incoming: DeviceRecord): DeviceRecord | undefined => {
  const arriving = normalRecord(incoming)
  if (!local) return arriving
  const chosen = winner(local, arriving)
  const other = chosen === local ? arriving : local
  const merged = normalRecord({ ...chosen, keys: unionKeys(chosen.keys, other.keys) })
  return same(merged, local) ? undefined : merged
}
